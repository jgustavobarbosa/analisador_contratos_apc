# Plano de Desenvolvimento — Analisador Preditivo de Contratos (RAY.IA)

## Overview

Plataforma PaaS local-first que mantém um **dossiê vivo** por contrato prestador–operadora, simula/audita faturamento (guias) e usa ML explicável para risco de glosa e melhoria de processo — com autenticação, perfis e CRUDs de plataforma desde a fundação.

**Objetivo operacional:** entregar, em fases homologáveis, um sistema multi-tenant (control plane + data plane) capaz de cobrir os 9 épicos do planejamento de produto, os 6 UCs e os CRUDs de identidade/acesso, validado primeiro no caso Unimed–Oncoradium.

**Classificação do pedido:** planejar (não implementar neste passo).

**Fontes:** `Analisador_Preditivo_Contratos_Prestadores_RAYIA.docx` + `Planejamento_Produto_Analisador_Contratos_RAYIA.docx`.

---

## ASSUMPTIONS (corrigir agora se discordar)

1. **Web app** (API + painel), não mobile nativo nesta fase.
2. **Stack InnovaIA recorrente:** NestJS/TypeScript + Prisma + PostgreSQL (data plane); React/TS no painel; Python (FastAPI/scikit-learn/LightGBM) no serviço de ML; LLM local via Hermes/Ollama/vLLM para extração.
3. **Auth:** sessão segura (cookie HttpOnly) ou JWT com refresh + RBAC; recuperação de senha por e-mail com token de uso único e expiração.
4. **Primeiro piloto:** lado **prestador** (redução de glosa), com visão operadora preparada no mesmo motor.
5. **PoC:** só EPIC-1/2/6 parciais + EPIC-0 (auth mínimo); ML preditivo (EPIC-4/8) entra após histórico ≥ 6–12 meses.
6. **Orçamento:** faixas do documento de produto (ticket de mercado), não cotação formal RAY.IA.
7. **Infra de piloto:** por hora **desenvolvimento local** (Mac/CI). VPS **nova e dedicada** a este projeto será provisionada depois, com configuração conjunta; a VPS atual compartilhada/sem Docker **não** é o alvo do piloto. `docker-compose.yml` opcional no desktop. Ver `docs/VPS-BARE-METAL.md` (ainda útil se a VPS nova também for bare-metal) e `docs/MVP-APRESENTACAO.md`.
8. **OCR/LLM local:** na apresentação aos parceiros, preferir **fixtures + extração assistida/golden** se o ambiente local não tiver GPU/RAM para LLM; LLM entra quando a VPS dedicada ou máquina local comportar.
9. **Meta imediata:** MVP demonstrável para parceiros (login + dossiê vivo do caso Unimed–Oncoradium + timeline + consulta de preço vigente), não PaaS multi-tenant completo.

---

## Capability Map

| Module id | Responsabilidade | Depende de |
|---|---|---|
| `identity` | Login, senha, recuperação, perfis/RBAC, CRUD usuários/organizações | — |
| `tenancy` | Provisionamento de tenant, isolamento, billing de uso (metadados) | `identity` |
| `ingestion` | Upload/pasta, OCR, extração LLM, fila de revisão | `tenancy` |
| `dossier` | Reconciliação por vigência, versionamento, cadeia evento→formalização | `ingestion` |
| `simulator` | Simulação on-demand/lote, elegibilidade, API/webhook ERP | `dossier` |
| `compliance` | Checklist cadastral, calendário regulatório, alertas 60/30/7 | `dossier` |
| `traceability` | Timeline, trilha de auditoria, relatórios | `dossier`, `simulator` |
| `ml-glosa` | Classificador de risco (boosting), SHAP, drift, recalibração | `dossier`, `simulator` |
| `ml-improve` | Anomalias, recomendador, fluxo de caixa, benchmark federado | `ml-glosa` |
| `security-gov` | Roteamento sensibilidade, anonimização, log imutável, direitos do titular | todos |

**Ordem de build:** `identity` → `tenancy` → `ingestion` → `dossier` → `simulator` + `compliance` + `traceability` → `ml-glosa` → `ml-improve` / PaaS avançado → reforço contínuo `security-gov`.

---

## Categoria de desenvolvimento recomendada

| Dimensão | Escolha | Por quê |
|---|---|---|
| Tipo de produto | **PaaS B2B healthtech regulado** (control plane + data plane) | Multi-tenant sem misturar dado sensível |
| Metodologia | **Spec-driven + fatias verticais + TDD nos núcleos** | Homologação e auditabilidade |
| Modelo preditivo (auditoria tabular) | **Gradient boosting (LightGBM/XGBoost) + SHAP** | Melhor custo/benefício e explicabilidade em dado tabular |
| Texto/contrato | **LLM local open-weight** (extração guiada por schema) | Local-first + confiança por campo |
| Anomalias / caixa | Isolation Forest ou autoencoder; Prophet/LSTM se volume justificar | Só onde o formato exige |
| Avançado (V2+) | GNN sobre grafo contrato–cláusula–código | Condicionado a volume |
| Squad | Enxuta MVP (3–5) → V1 (5–8) → V2 (8–12) | Conforme doc de produto |

**Decisão ML para auditoria:** não começar com rede neural profunda no risco de glosa. Boosting + SHAP atende NFR de explicabilidade; redes entram em OCR/LLM, séries e grafo.

---

## Arquitetura (resumo)

```
┌─────────────────────────────────────────────┐
│ Control plane (RAY.IA / nuvem soberana)     │
│ identity, tenancy, billing, catálogo, metas │
└─────────────────┬───────────────────────────┘
                  │ eventos agregados (sem PII)
┌─────────────────▼───────────────────────────┐
│ Data plane (por tenant: on-prem / VPC)      │
│ docs, guias, dossiê, OCR, LLM, ML, inferência│
└─────────────────────────────────────────────┘
```

- Nenhum CPF/nome/guia/dado clínico no control plane.
- Nuvem pública de LLM só com anonimização prévia e log de roteamento.

---

## Dados de desenvolvimento (plano de dados)

### Fontes e datasets

| Dataset | Uso | Sensibilidade | Ambiente |
|---|---|---|---|
| Contrato Unimed–Oncoradium + 3 aditivos + cartas (`CONTRATO UNIMED.zip`) | PoC dossiê + golden timeline | Comercial | Dev/staging isolado |
| Fixtures sintéticas de guias (TUSS, valores, status paga/glosada) | Simulator + testes | Baixa (fake) | CI/dev |
| Histórico real de guias do piloto (≥6–12 meses) | Treino EPIC-4/8 | Saúde / LGPD | Só data plane do tenant |
| Dicionário oncologia (códigos, cláusulas, RN510 checklist) | Regras + features | Baixa | Versionado no repo |

### Contratos de dado (mínimo)

- **Documento bruto:** imutável + checksum + proveniência (arquivo, página, quem/quando).
- **Campo extraído:** valor, confiança, status (`pending_review` | `accepted` | `rejected`), nunca “inventado”.
- **Vigência:** quatro datas distintas — evento, notificação, assinatura, vigência.
- **Guia:** código, data atendimento, valor, operadora, status final, motivo glosa (padronizado).
- **Predição:** versão do modelo, features, score, SHAP top-k, decisão humana se houver.

### Ambientes

| Ambiente | Dados | Critério |
|---|---|---|
| Local/CI | sintético + contrato-base redigido se necessário | Sem beneficiário real |
| Staging | espelho do piloto com DPA | Isolado |
| Produção tenant | data plane do cliente | DPIA + sign-off |

### Qualidade / linhagem

- Idempotência de ingestão por hash do arquivo.
- Quarentena de campos abaixo do limiar de confiança.
- Contagens entrada/saída/rejeição em todo lote.
- Diferenciar `ausente` / `não informado` / `inferido` / `revisado_humano`.

---

## Épicos × casos de uso × CRUDs

### EPIC-0 — Identidade, acesso e CRUDs de plataforma (fundação)

Não estava numerado nos docs; é pré-requisito explícito pedido para o sistema.

| CRUD / fluxo | Descrição | Critérios de aceite |
|---|---|---|
| Registro/provisionamento de usuário | Admin cria usuário no tenant | E-mail único; senha política mínima; papel obrigatório |
| Login / logout | Sessão autenticada | Bloqueio após N falhas; rate limit; sem vazar se e-mail existe |
| Recuperação de senha | Token one-time + expiração | Link inválido após uso; audit log |
| Perfis (RBAC) | `admin`, `juridico`, `faturamento`, `compliance`, `auditoria`, `diretoria`, `somente_leitura` | Autorização no servidor, não só UI |
| CRUD Organização/Tenant | Dados cadastrais do cliente | Isolamento por `tenant_id` |
| CRUD Usuários | Ativar/desativar, reset forçado | Soft-delete; trilha de quem alterou |
| CRUD Papéis e permissões | Mapeamento papel→ação | Sem escalação horizontal (IDOR) |
| Preferências / MFA (V1+) | 2FA TOTP opcional no MVP+ | Obrigatório para `admin` em produção |

**UC implícitos:** UC-AUTH-01 login; UC-AUTH-02 reset senha; UC-AUTH-03 gestão de perfis; UC-06 (PaaS) depende deste épico.

### EPIC-1 — Ingestão e extração → alimenta UC-03, PoC

Upload/pasta · OCR · LLM schema · fila revisão humana.

### EPIC-2 — Dossiê vivo → UC-01, UC-02, UC-03

Reconciliação por vigência · versionamento · vínculo evento→formalização · export PDF/JSON.

### EPIC-3 — Simulador / segunda opinião → UC-01, UC-02

On-demand · elegibilidade · batch · API/webhook (< 3s NFR).

### EPIC-4 — Motor preditivo de glosa → UC-01 (score), UC-05 (base)

LightGBM/XGBoost · SHAP · recalibração · alerta de padrão emergente.

### EPIC-5 — Radar compliance → UC-04

Checklist RN510 · calendário · alertas 60/30/7.

### EPIC-6 — Rastreabilidade → UC-02, UC-03

Timeline · trilha de decisões · relatórios jurídico/diretoria.

### EPIC-7 — PaaS → UC-06

Provisionamento · conectores · API pública · billing · console admin.

### EPIC-8 — Analisador de melhorias → UC-05

Anomalias · recomendador · fluxo de caixa · benchmark federado (opcional).

### EPIC-9 — Segurança / LGPD → transversal

Roteamento multimodelo · anonimização · log imutável · direitos do titular (art. 18).

### Mapa UC → épicos

| UC | Épicos |
|---|---|
| UC-01 Prestador simula guia | 0, 2, 3, 4 |
| UC-02 Operadora audita lote | 0, 2, 3, 6 |
| UC-03 Jurídico rastreia cláusula | 0, 1, 2, 6 |
| UC-04 Compliance doc vencendo | 0, 5 |
| UC-05 ML recomenda melhoria | 0, 4, 8 |
| UC-06 Provisiona tenant | 0, 7, 9 |

---

## Estimativa de planejamento e entrega

### Esforço por fase (calendário, squad enxuta)

| Fase | Escopo | Duração | Faixa investimento (mercado doc) |
|---|---|---|---|
| **PoC** | EPIC-0 mínimo + 1+2+6 parciais no caso-base | 4–6 semanas | R$ 25k–60k |
| **MVP** | 0–3, 5, 6 + 9 baseline; 1º tenant | 3–4 meses | R$ 250k–450k (vários épicos) |
| **V1** | EPIC-4 + homologação regulatória + MFA | +2–3 meses | + R$ 80k–200k (ML) |
| **V2** | EPIC-7 completo + EPIC-8 | +3–4 meses | + R$ 150k–400k |
| **V3+** | Demais dicionários de prestador + GNN | sob demanda | variável |

### Ticket por tipo de funcionalidade (referência doc)

| Tipo | Faixa |
|---|---|
| Simples (alerta, checklist, CRUD básico) | R$ 8k–20k |
| Média (simulação, painel, integração) | R$ 20k–50k |
| Com ML | R$ 50k–150k+ |
| Épico completo (4–8 funcs) | R$ 60k–250k |

### Pontos de atenção na estimativa

- Extração LLM + revisão humana costuma dominar o MVP.
- ML só é “pronto” após massa crítica de guias — comunicar “modo colheita” no piloto.
- Isolamento multi-tenant e DPIA não são “polish”; entram no caminho crítico de homologação.

---

## Plano de teste, uso e homologação

### Pirâmide de testes

| Nível | O que | Gate |
|---|---|---|
| Unitário | Vigência, RBAC, hashing, regras elegibilidade | A cada commit |
| Integração | ingestão → dossiê → simulação; auth reset | A cada PR/release |
| Contrato | control plane ↔ data plane APIs | A cada mudança de API |
| ML | CV, backtest, matriz por código/operadora, fairness | A cada treino |
| Segurança | isolamento tenant, IDOR, deps, pentest | Pré-homologação |
| LGPD/DPIA | anonimização, retenção, direitos titular | Pré go-live tenant |
| UAT | analista faturamento + auditor + jurídico | Antes de cada homologação |
| Drift | performance modelo em produção | Contínuo |

### Roteiro de uso homologado (caso-base)

1. Admin provisiona tenant e usuários com papéis.
2. Jurídico sobe os 5 documentos Unimed–Oncoradium.
3. Revisor aceita campos de baixa confiança.
4. Sistema reconstrói timeline: 01/10/2020 → 13/03/2024 → aditivos 1–3 (vigências retroativas).
5. Faturamento simula códigos 89999959 etc. do aditivo ago/2024 → valores R$ 325–400.
6. Compliance vê checklist RN510 com validades.
7. Sign-off domínio: dossiê = realidade contratual sem correção manual recorrente.

### Critérios go/no-go

| Critério | Limiar sugerido |
|---|---|
| Campos alta confiança corretos | ≥ 95% |
| Simulação on-demand | < 3 s |
| Timeline PoC | 100% dos 4 eventos da seção 1 do doc preditivo |
| Isolamento tenant | 0 vazamento em testes automatizados |
| Modelo glosa (V1) | métricas acordadas + SHAP presente; revisão humana obrigatória |

### Uso em produção (governança)

- IA = segunda opinião; decisão jurídica/financeira humana.
- Toda predição versionada e auditável.
- Alertas acionáveis (pessoa + prazo), não só log.
- Recalibração com gate de fairness antes de publicar modelo.

---

## Roadmap consolidado

```
PoC (4–6 sem)  →  MVP (tenant 1)  →  V1 (ML glosa)  →  V2 (PaaS + melhorias)  →  V3+ (segmentos)
EPIC 0,1,2,6*     0–3,5,6,9          4 (+9)            7,8                      dicionários/GNN
```

\*parcial na PoC.

---

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| OCR ruim em PDF escaneado | Alto | Fila humana; nunca aplicar baixa confiança |
| Ambiguidade jurídica | Alto | Sinaliza; humano decide |
| Pouco histórico para ML | Médio | Modo regras no MVP; colheita transparente |
| Vazamento multi-tenant | Crítico | Testes de isolamento + data plane segregado |
| Adoção faturamento | Médio | Começar como segunda opinião + métrica de glosa evitada |

---

## Open questions (só as que mudam o plano)

1. Piloto primeiro: **prestador** (hipótese) ou operadora?
2. Implantação do 1º data plane: on-prem, VPC ou nuvem soberana?
3. Auth: SSO corporativo (SAML/OIDC) já no MVP ou só V1?
4. Cotação formal interna RAY.IA substitui as faixas de mercado?
5. Na VPS atual: Postgres já existe? Quanto de RAM/disco livres (`free -h` / `df -h`)? Qual process manager (systemd/pm2)?
6. Nginx/Caddy já faz TLS — subdomain ou path para o Analisador?

---

## Próximo passo autorizado

Aprovar este plano (e as assumptions). Em seguida: `SPEC-identity.md` + bootstrap do repositório — **ainda sem código de produto até autorização explícita de implementação**.
