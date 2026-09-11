# EPIC-8 — Analisador de melhoria de prestação de contas

**Track:** REAL per-tenant; optional federated benchmark without raw cross-tenant data.  
**Target:** `src/ml/process_optimizer/`.  
**Status:** Architecture scaffold — heuristic detectors + contracts; ML scorers swappable.

## Objective
Anomalias, ranking de ações corretivas, projeção de impacto financeiro, benchmark agregado anônimo.

## Implemented (v0.1)

| Piece | Path |
|---|---|
| Input aggregation schema | `schemas/aggregation_input.ts` |
| Prescriptive output | `schemas/recommendation_output.ts` |
| Root-cause clustering | `detectors/root_cause_clusterer.ts` |
| Batch anomaly (z-score) | `detectors/batch_anomaly_detector.ts` |
| Service facade | `service.ts` |
| Anonymous multi-tenant + Fed hook | `federation/anonymous_aggregate.ts` |

## Techniques (roadmap)
Isolation Forest / autoencoder (`AnomalyScorer`); counterfactual + SHAP on glosa model; Prophet/LSTM if volume justifies; secure FedAvg when EPIC-7 control plane is ready.

## Acceptance
- [x] Aggregation input + pattern detection job API (in-process)
- [x] Recommendation objects with estimated impact (`requiresHumanApproval`)
- [x] Federation-ready anonymous contributions (no raw cross-tenant data)
- [ ] Persist human approval loop → action item
- [ ] Isolation Forest scorer in production jobs
