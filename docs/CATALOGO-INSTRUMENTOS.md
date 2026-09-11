# Catálogo de instrumentos (EPIC-1/2 — pontos 1 e 2)

Base analítica do dossiê vivo: **corpus caso-base local** + **catálogo de referência externo** (metadados e URLs, sem cópia integral de textos proprietários).

## Corpus primário — Unimed × Oncoradium

PDFs reais em:

`apps/api/fixtures/contracts/unimed-oncoradium/pdfs/`

| Arquivo | Papel no caso |
|---|---|
| `DOCUMENTO2024-02-23 (2).pdf` | Aditivo fev/2024 (RN510 e alinhamentos) |
| `Unimed2024-07-11-consulta.pdf` | Comunicação / peça sobre consulta (jul/2024) |
| `aditivo unimed - sobre consulta - enviado a diretoria.pdf` | Aditivo que exclui consulta eletiva |
| `Comunicado_unimed_suspensao_consulta_eletiva_-_para_assinar_assinado.pdf` | Comunicado de suspensão (assinado) |
| `termo aditivo ao contrato  unimed - doc recebido em 06.08.2024.pdf` | Aditivo taxas de sala (ago/2024) |

Esses arquivos são o **corpus operacional** da demo e dos testes de ingestão/evidência. O seed golden materializa cobertura/preço; o endpoint `POST /contracts/seed/unimed-pdfs` importa os PDFs com checksum e vínculo ao catálogo (`caso_base`).

## Catálogo externo — referência (não verbatim)

Instrumentos ANS, CFM, associações, minutas públicas e **índices** Jusbrasil entram apenas como:

- `code`, `title`, `sourceKind`, `sourceUrl`, `publisher`, `summary`, `tags`
- vínculo opcional a **dimensões de controle**

**Não** versionamos no repositório o texto integral de peças proprietárias (ex.: download em massa de Jusbrasil). O operador abre a URL externa quando precisar do teor.

Tipos de origem (`sourceKind`): `ans` | `cfm` | `associacao` | `jusbrasil` | `hospital` | `caso_base` | `outro`.

## Dimensões de controle

Chaves estáveis (português, snake_case) usadas em `CatalogDimension` e na análise:

| Código | Uso |
|---|---|
| `basilar` | Fundamentos legais/contratuais obrigatórios |
| `clausulas` | Cláusulas típicas e redacionais |
| `tipos_prestacao` | Modalidades de prestação (ambulatorial, hospitalar, etc.) |
| `elementos_controle` | Controles operacionais e contratuais |
| `elementos_alerta` | Sinais de risco / gatilhos de alerta |
| `tipos_manutencao` | Manutenção, reajuste, aditivos |
| `previsibilidade` | Clareza de vigência, valores e escopo |
| `acordabilidade` | Espaço de negociação / formalização |
| `plausabilidade` | Coerência entre peças e prática |
| `sinalizacao` | Como o instrumento sinaliza mudanças |
| `monitoramento` | Acompanhamento contínuo pós-assinatura |
| `adequacao` | Adequação regulatória (ANS/RN etc.) |
| `pontos_verificacao` | Checklist de verificação humana |
| `pontos_controle` | Pontos de controle no fluxo do dossiê |

## API

- `GET /catalog/dimensions` — lista dimensões (`catalog:read`)
- `GET /catalog/instruments?dimension=&sourceKind=` — filtra instrumentos
- `GET /catalog/instruments/:code` — detalhe + dimensões

Seed idempotente: `apps/api/prisma/catalog-seed-data.ts` (upsert por `code`), chamado em `prisma/seed.ts`.

## Relação com o dossiê

`ContractDocument.catalogInstrumentId` (opcional) liga um PDF ingerido à entrada do catálogo — especialmente os cinco PDFs Unimed (`caso_base`).
