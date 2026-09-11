# EPIC-8 — `process_optimizer`

Motor de recomendações de processo com base em histórico consolidado de faturamento/glosas.

**Track:** REAL (tenant data plane). Não treinar com fixtures de `src/simulation`.

## Layout

```
schemas/           # entrada (agregação periódica) + saída prescritiva
detectors/         # clusterização de causas-raiz + anomalias de lote
recommendations/   # gerador de recomendações (problema, evidência, R$, plano)
federation/        # agregação multi-tenant anônima + gancho FedAvg
service.ts         # fachada ProcessOptimizerService
fixtures/          # dados sintéticos só para testes
```

## Fluxo

1. Job periódico monta `ProcessAggregationInput` (séries, TISS, latência, lotes).
2. `detectOperationalPatterns` → clusters + anomalias.
3. `generateProcessRecommendations` → objetos com `requiresHumanApproval: true`.
4. Opt-in: `exportAnonymousContribution` para benchmark (hash de tenant, sem PII).

## Federação / isolamento (EPIC-7 / EPIC-9)

- Control plane recebe só histogramas e taxas bucketizadas.
- `tenantId` nunca sai em claro — apenas `tenantHash` com salt de plataforma.
- `NullFederatedLearningAdapter` valida schema antes de enfileirar pesos opacos.

## Próximos upgrades

- Isolation Forest / autoencoder no `AnomalyScorer`
- Counterfactual + SHAP do modelo de glosa (EPIC-4)
- Loop de aprovação humana → action item persistido
