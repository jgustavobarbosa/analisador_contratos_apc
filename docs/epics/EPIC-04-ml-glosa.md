# EPIC-4 — Motor preditivo de glosa

**Track:** REAL training data only inside tenant data plane; never train on SIMULATION fixtures alone and call it production.  
**Target:** `src/ml/glosa/`.

## Current (MVP)
Deterministic `evaluateRisk` + `/risk/features` feature scaffold (explicable reasons).

## Target
- LightGBM/XGBoost + SHAP when ≥6–12 months paid/glosa history exists
- Per-tenant models; federated/aggregate only with anonymized stats

## Acceptance
- [x] Rules engine + feature export
- [ ] Trained model + drift monitoring + fairness gate
