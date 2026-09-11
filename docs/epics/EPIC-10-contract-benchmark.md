# EPIC-10 — Radar Comparativo e Score de Custo-Benefício

**Module id:** `contract-benchmark`  
**Track:** REAL (tenant + peer anonymized); SIMULATION for demo ranking.  
**Depends on:** dossier, simulator  
**Status:** Spec scaffold — UI KPIs prepared; engine pending Prompt 2+.

## Objective
Normalizar cláusulas e tabelas de preço entre prestadores do mesmo segmento (hospital, SADT/clínica, home care, laboratório/imagem). Ranquear eficiência operacional, margem de economia e desvios vs referências de mercado (CBHPM / SIMPRO / Brasíndice).

## Acceptance (target)
- [x] Segment-normalized score weights (30/35/15/20) — `calculateContractScore`
- [x] Peer ranking + Contrato Benchmark + oportunidades de renegociação
- [x] Dashboard KPI “Potencial de Economia Contratual” (proxy UI) + API demo analytics
- [ ] Persist peer vectors in warehouse / Postgres analytics schema
