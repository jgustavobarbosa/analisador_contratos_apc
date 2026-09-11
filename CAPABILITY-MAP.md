# Capability Map: Analisador Preditivo de Contratos RAY.IA

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Accounts, sessions, password recovery, RBAC, user/org CRUDs | — |
| tenancy | Tenant provisioning, isolation, usage metering metadata | identity |
| ingestion | Upload/watched folder, OCR, LLM extraction, human review queue | tenancy |
| dossier | Vigency reconciliation, versioning, event→formalization chain | ingestion |
| simulator | On-demand/batch billing simulation, eligibility, ERP API/webhook | dossier |
| compliance | Cadastral checklist, regulatory calendar, 60/30/7 alerts | dossier |
| traceability | Timeline, decision audit trail, legal/board reports | dossier, simulator |
| ml-glosa | Glosa risk classifier (boosting), SHAP, drift, recalibration | dossier, simulator |
| ml-improve | Anomalies, corrective recommendations, cashflow, federated benchmark | ml-glosa |
| contract-benchmark | **EPIC-10** — Radar comparativo e score de custo-benefício | dossier, simulator |
| catalog-fraud-engine | **EPIC-11** — Banco unificado de insumos/serviços & central antifraude | ingestion, ml-glosa |
| compliance-matrix | Matriz 4 pilares (Fin 35% · Reg 25% · Ope 25% · Jur 15%) — `src/core/analytics/compliance_matrix.ts` | dossier, simulator, contract-benchmark |
| security-gov | Sensitivity routing, anonymization, immutable logs, data-subject rights | all |

**Build order:** identity → tenancy → ingestion → dossier → simulator, compliance, traceability → ml-glosa → ml-improve → **contract-benchmark (EPIC-10)** → **catalog-fraud-engine (EPIC-11)** / PaaS → continuous security-gov.

**Specs:**
- `docs/epics/` — EPIC-0 … EPIC-11
- `SPEC-identity.md`, `SPEC-dossier.md`
- `.cursorrules` — Two-Track REAL vs SIMULATION (permanente)
- `docs/DESIGN-SYSTEM-RAYIA.md` — Dark Theme
- `src/` — scaffold alvo (`core`, `ml`, `api`, `simulation`)

Fonte de plano: `tasks/plan.md`.
