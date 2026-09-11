# Task List — Fase MVP Épicos 0–6

Fonte: `docs/FASE-MVP-EPIC-0-6.md` + `tasks/plan.md`.

## Já feito (PoC)

- [x] EPIC-0 API: login, sessão, RBAC, CRUD users API, seed admin
- [x] EPIC-2/6 slim: dossiê golden Oncoradium, timeline, priceAt
- [x] Web demo login + caso golden

---

## Pontos 1–2 — Catálogo normativo + PDFs Unimed

- [x] Spec `docs/CATALOGO-INSTRUMENTOS.md` (corpus local + referência externa)
- [x] Prisma: CatalogInstrument / Dimension / join + FK opcional em ContractDocument
- [x] Seed metadados (ANS/CFM/ASAMP/Jusbrasil/minutas + 5 PDFs caso_base)
- [x] API `GET /catalog/dimensions|instruments` + `catalog:read`
- [x] `POST /contracts/seed/unimed-pdfs` (checksum + vínculo catálogo)
- [x] UI aba Catálogo + botão Importar PDFs Unimed no Dossiê
- [x] Testes catalog + unimed-pdfs

---

## Wave A — EPIC-0 UI + EPIC-1 ingestão

- [x] A1: UI gestão de usuários (listar, criar, desativar, trocar papel)
- [x] A2: UI recuperação de senha (request + confirm)
- [x] A3: Upload PDF → storage local + checksum + `ContractDocument`
- [x] A4: Metadados de evidência (uploadedBy, uploadedAt, checksum, storageKey)
- [x] A5: Testes upload + isolamento tenant

### Checkpoint A
- [ ] Admin cria usuário pela UI e faz login com ele
- [ ] PDF aparece na timeline/documentos do contrato

## Wave B — EPIC-1 revisão + EPIC-2 aplicação

- [x] B1: Modelo ExtractionBatch / ExtractedField (se ainda incompleto)
- [x] B2: Endpoint extrair assistido (payload JSON schema ou parser mínimo de texto)
- [x] B3: Fila revisão: accept/reject/correct
- [x] B4: Ao aceitar, reconciliar → nova `DossierVersion`
- [x] B5: Export `GET .../export.json`
- [x] B6: Testes golden + fluxo upload→review→query

### Checkpoint B
- [ ] Campo baixa confiança não altera dossiê até accept
- [ ] Export JSON com snapshotHash

## Wave C — EPIC-3 simulador + EPIC-6 audit

- [x] C1: `POST /simulations` (código, data, valor informado?) → esperado + alertas
- [x] C2: Modo lote
- [x] C3: Persistir evidência da simulação
- [x] C4: Audit trail unificado (auth + dossier + simulation) na UI
- [x] C5: Testes NFR smoke (&lt; 3s local)

### Checkpoint C
- [ ] UC-01 simulador na UI
- [ ] Trilha mostra quem simulou / quem aceitou campo

## Wave D — EPIC-5 compliance + EPIC-4 regras

- [x] D1: Checklist RN510 (12 docs) com validade por item
- [x] D2: Alertas 60/30/7
- [x] D3: Motor risco regras + features JSON (scaffold ML)
- [x] D4: UI compliance + badge de risco na simulação
- [x] D5: Testes compliance + risco

### Checkpoint D (fim EPIC 0–6 desta fase)
- [x] UC-01, UC-03, UC-04 cobertos em fluxo manual
- [x] Suite de testes API verde
- [x] README da fase atualizado

---

## Não fazer agora

- EPIC-7/8, treino LightGBM em produção, SSO/MFA, Docker obrigatório
