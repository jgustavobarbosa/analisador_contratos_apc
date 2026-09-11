# src/ml — TRACK REAL (tenant data plane)

- `glosa/` — rules → LightGBM/SHAP (EPIC-4)
- `process_optimizer/` — anomalias, clusterização, recomendações, federação (EPIC-8)
- `llm_advisor/` — copiloto prescritivo + minutas de aditivo (EPIC-8 / ANS)
- `contract_benchmark/` — radar comparativo / custo-benefício (EPIC-10) → ver `src/core/analytics`
- `catalog_fraud/` — de-para + antifraude (EPIC-11) → ver `src/core/analytics`
- `process/` — legado; redireciona para `process_optimizer/`

Never train production models solely on `src/simulation` fixtures.
