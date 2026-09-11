# `src/core/analytics` — EPIC-10 / EPIC-11 / Matriz 4 pilares

Motores de inteligência de negócios do Analisador Preditivo.

| Arquivo | Função |
|---|---|
| `catalog_engine.ts` | De-para TUSS/TISS/Brasíndice/SIMPRO/ANVISA; outlier >15%; unbundling |
| `benchmark_engine.ts` | `calculateContractScore` (30/35/15/20) + ranking por segmento |
| `fraud_engine.ts` | Burst alta complexidade; auth mismatch; porte × diárias |
| `compliance_matrix.ts` | Matriz Fin 35% · Reg 25% · Ope 25% · Jur 15% (≥16 checks) |
| `bridge_simulation.ts` | Enriquece perfil demo sem gravar em produção |

**Spec:** `docs/SPEC-compliance-matrix.md`

## Integração

- Simulação: `DemoProviderProfile.qualityScorecard` via `provider_generator`
- API demo: `GET /demo/analytics/providers/:type`
- Symlink: `apps/api/src/core` → `src/core`
