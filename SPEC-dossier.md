# Spec: dossier

## Objective

Manter, por contrato prestador–operadora, um **dossiê vivo**: estado reconciliado a partir do contrato original + aditivos + cartas + comunicados, versionado (nunca sobrescrito), com cadeia evento→formalização e exportação — base para simulação, compliance e rastreabilidade.

**Quem usa:** jurídico (revisão/consulta), faturamento (consulta vigente), auditoria, diretoria (export).

**Sucesso (PoC):** o caso Unimed–Oncoradium reconstrói a timeline da seção 1 do documento preditivo sem correção manual recorrente; consulta “valor/código vigente em data D” responde em segundos com proveniência.

## ASSUMPTIONS

1. Ingestão (upload + OCR + extração LLM) é módulo `ingestion` separado; esta spec define o **contrato de entrada** (documento estruturado revisado) e o motor de reconciliação.
2. Na PoC, `ingestion` e `traceability` (timeline UI) entregam fatia mínima junto com `dossier` — sem virar escopo infinito de OCR.
3. Conflitos resolvem por **data de vigência declarada**, não por data de recebimento/upload.
4. Campos com confiança abaixo do limiar **não** entram no estado vigente até revisão humana (`identity` + permissão `dossier:review`).
5. Extração LLM é local-first; baixa confiança → fila; nunca “completar” cláusula ausente como fato.
6. Dataset golden: 5 documentos Unimed–Oncoradium (+ aditivos/cartas) em `CONTRATO UNIMED.zip`.

→ Corrigir agora se discordar.

## Tech Stack

| Peça | Escolha |
|---|---|
| API | NestJS + Prisma + PostgreSQL |
| Extração (vizinho) | serviço Python/Docling/OCR + LLM local via Hermes |
| Export | JSON canônico + PDF de snapshot (PoC pode ser JSON-only) |
| UI | React — timeline e tela de revisão |
| Testes | Vitest/Jest + fixtures golden + contract tests |

## Commands (alvo)

```
Dev:           pnpm --filter api dev
Test dossier:  pnpm --filter api test -- dossier
Golden replay: pnpm --filter api test -- golden-oncoradium
Migrate:       pnpm --filter api prisma migrate dev
```

## Project Structure (módulo)

```
apps/api/src/modules/dossier/
  contracts/       → CRUD contrato + vínculo partes
  documents/       → metadados de documentos ligados ao contrato
  reconciliation/  → aplica revisão aceita → nova versão do estado
  queries/         → estado vigente em data D; histórico de código/preço
  export/          → snapshot JSON/PDF
apps/web/src/features/dossier/
  TimelinePage, ReviewQueuePage, ContractMapPage
tests/dossier/
  reconciliation.spec.ts
  golden-oncoradium.spec.ts
fixtures/contracts/unimed-oncoradium/
```

## Domain model

### Camadas do dossiê (estado)

| Camada | Conteúdo |
|---|---|
| Partes | razão social, CNPJ, registro ANS, tipo prestador, CNES |
| Escopo vigente | códigos/procedimentos cobertos com histórico inclusão/exclusão |
| Tabela de preços versionada | código → valor → intervalo [vigênciaInício, vigênciaFim) |
| Cadeia documental | docs com 4 datas: evento, notificação, assinatura, vigência |
| Cláusulas / SLAs / regulatório | RN510, LGPD, prazos — referências; checklist detalhado em `compliance` |
| Eventos operacionais | suspensões, comunicados ainda sem aditivo |
| Proveniência | quem assinou, método, arquivo, página, confiança |

### Entidades

| Entidade | Campos-chave |
|---|---|
| `Contract` | id, tenantId, partyA, partyB, status, createdAt |
| `ContractDocument` | id, contractId, type (`contrato`\|`aditivo`\|`carta`\|`comunicado`), storageKey, checksum, uploadedBy, uploadedAt |
| `DocumentDates` | eventAt, notifiedAt, signedAt, effectiveAt (nullable independentes) |
| `ExtractionBatch` | documentId, modelVersion, status |
| `ExtractedField` | batchId, path, valueJson, confidence, status (`pending_review`\|`accepted`\|`rejected`), reviewedBy, reviewedAt |
| `DossierVersion` | id, contractId, version, effectiveFrom, createdAt, causedByDocumentId, snapshotHash |
| `CoverageItem` | dossierVersionId, code, action (`include`\|`exclude`), effectiveAt |
| `PriceItem` | dossierVersionId, code, amount, currency, effectiveAt, effectiveUntil |
| `CausalLink` | fromDocumentId, toDocumentId, relation (`motivates`\|`implements`) |
| `DossierAuditEvent` | actor, action, contractId, version, metadata |

## Regras de reconciliação

1. Documento só aplica efeito depois que campos obrigatórios estiverem `accepted` (ou confiança ≥ limiar configurável, default 0,85, **sem** auto-aplicar cláusulas jurídicas ambíguas).
2. Ordenação de aplicação: `effectiveAt` ascendente; empate → `signedAt` → `uploadedAt`.
3. Exclusão de código (ex.: 10101012 em 08/07/2024) fecha cobertura/preço anterior com `effectiveUntil`.
4. Vigência retroativa (aditivo assinado 06/08 com vigência 01/08) altera estado **histórico** a partir de 01/08; consultas por data D refletem isso.
5. Nunca deletar versão anterior; sempre append-only de `DossierVersion`.
6. Carta/notificação pode criar `CausalLink` para aditivo posterior sem alterar tabela de preços sozinha (salvo regra explícita aceita).

## Fluxos (PoC)

### Fluxo A — Ingestão → revisão → dossiê

1. Usuário autenticado (`dossier:write`) faz upload do PDF.
2. `ingestion` OCR + extrai campos com confiança.
3. Campos `< limiar` vão à fila; revisor (`dossier:review`) aceita/corrige/rejeita.
4. Motor gera nova `DossierVersion` e atualiza mapa de cobertura/preços.
5. Timeline exibe nó do documento + link causal se houver.

### Fluxo B — Consulta vigente (base do UC-01)

Entrada: `contractId`, `code`, `at: Date`.  
Saída: `{ covered: boolean, amount?: number, sourceDocumentId, dossierVersionId, warnings[] }`.

### Fluxo C — UC-03 Jurídico rastreia cláusula/preço

1. Seleciona item no mapa.
2. Sistema mostra documento origem, 4 datas, versão do dossiê, links causais.

### Golden timeline (aceite PoC)

| Data | Evento | Efeito esperado no dossiê |
|---|---|---|
| 01/10/2020 | Contrato original | Estado base oncologia |
| 13/03/2024 | Notificação suspensão radioterapia | Evento operacional + link futuro |
| ~02/2024 (vigência retroativa 1º aditivo) | Aditivo RN510/LGPD/checklist | Obrigações regulatórias + docs cadastrais |
| 08/07/2024 | 2º aditivo | Exclui código 10101012 |
| 01/08/2024 (assinado 06/08) | 3º aditivo | Inclui 4 códigos taxa sala quimio (R$ 325–400) |

## API (contrato preliminar)

| Método | Path | Permissão |
|---|---|---|
| POST | `/contracts` | `dossier:write` |
| GET | `/contracts/:id` | `dossier:read` |
| POST | `/contracts/:id/documents` | `dossier:write` |
| GET | `/contracts/:id/documents` | `dossier:read` |
| GET | `/review-queue` | `dossier:review` |
| POST | `/extracted-fields/:id/accept` | `dossier:review` |
| POST | `/extracted-fields/:id/reject` | `dossier:review` |
| GET | `/contracts/:id/dossier` | `dossier:read` — estado atual |
| GET | `/contracts/:id/dossier/at?date=` | `dossier:read` |
| GET | `/contracts/:id/prices/:code?at=` | `dossier:read` |
| GET | `/contracts/:id/timeline` | `dossier:read` |
| GET | `/contracts/:id/export.json` | `dossier:export` |

Tenant sempre derivado da sessão.

## Code Style

```ts
// Consulta vigente — determinística, testável, sem LLM
function priceAt(items: PriceItem[], code: string, at: Date): PriceItem | null {
  return items
    .filter((i) => i.code === code && i.effectiveAt <= at && (i.effectiveUntil == null || at < i.effectiveUntil))
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0] ?? null;
}
```

- Separar **extração probabilística** (ingestion) de **reconciliação determinística** (dossier).
- Todo campo aplicado carrega `sourceDocumentId` + `extractionFieldId`.
- Diferenciar semanticamente: `ausente` | `nao_informado` | `inferido` | `revisado_humano`.

## Testing Strategy

| Nível | Casos |
|---|---|
| Unit | `priceAt`, exclusão de código, vigência retroativa, empate de datas |
| Integration | upload mock → accept fields → nova versão → query at date |
| Golden | fixtures Oncoradium → timeline e 4 preços de taxa de sala |
| Segurança | usuário de outro tenant não lê contrato (IDOR) |
| Contrato | schema JSON de export versionado |

## Boundaries

- **Always:** append-only de versões; proveniência; quarentena de baixa confiança; testes golden no CI após PoC.
- **Ask first:** limiar de auto-aceitação; aplicar carta como mudança de preço sem aditivo; schema breaking do export.
- **Never:** sobrescrever dossiê in-place; promover inferência LLM a fato sem revisão quando confiança baixa; enviar PDF/guia a LLM de nuvem pública sem anonimização (EPIC-9).

## Success Criteria

- [ ] Golden Oncoradium: timeline com os eventos acima e links causais carta→aditivo
- [ ] Query `prices/10101012?at=2024-07-09` → não coberto
- [ ] Query dos 4 códigos de taxa de sala `at=2024-08-02` → valores do aditivo (mesmo antes da assinatura 06/08)
- [ ] Export JSON reproduzível (mesmo snapshotHash para mesmo estado)
- [ ] Fila de revisão obriga humano abaixo do limiar
- [ ] Isolamento por tenant verificado

## Out of scope (esta spec)

- Simulador de guia completo (módulo `simulator`) — só a query vigente que ele consumirá
- Treino ML de glosa
- Checklist operacional RN510 (módulo `compliance`) — dossiê só armazena referências/exigências extraídas
- OCR/LLM internals (módulo `ingestion`) além do contrato de `ExtractedField`

## Open Questions

1. Limiar default 0,85 é aceitável para o piloto ou jurídico exige revisão de 100% na PoC?
2. PDF de export no PoC ou só JSON?
3. Pasta monitorada automática já na PoC ou só upload manual?

## Dependencies

- **Depende de:** `identity` (authz), `tenancy` (tenantId), `ingestion` (produz `ExtractedField`).
- **Consumido por:** `simulator`, `compliance`, `traceability`, `ml-glosa`.

## PoC slice (entregável conjunto)

Para a PoC de 4–6 semanas, entregar junto (sem specs separadas ainda):

1. Upload manual + extração mínima (ingestion slim)
2. Reconciliação + queries vigentes (esta spec)
3. Timeline read-only (traceability slim)
4. Auth mínima (`SPEC-identity`)
