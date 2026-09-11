# SPEC — Matriz de Adequação e Qualidade Contratual (4 Pilares)

**Module:** `src/core/analytics/compliance_matrix.ts`  
**Track:** REAL (inputs tenant) + SIMULATION (scores via `provider_generator`)  
**Status:** v0.1 — Prompt 1

## Fórmula

\[
\text{Score Global} = 0.35 \times Fin + 0.25 \times Reg + 0.25 \times Ope + 0.15 \times Jur
\]

| Dimensão | Código | Peso | Foco |
|---|---|---|---|
| Financeiro & Tabela | `FINANCEIRO` | 35% | Dispersão vs mediana CBHPM/SIMPRO/Brasíndice; pacotes fechados vs conta aberta |
| Conformidade Regulatória | `REGULATORIO_ANS` | 25% | RN 510/2022, RN 507/2022, RDC 36/2013 |
| Eficiência Operacional | `OPERACIONAL` | 25% | Glosa recorrente/evitada, prazos de recurso, pré-autorização |
| Segurança Jurídica | `JURIDICO` | 15% | Reajuste claro, SLA/penalidades, foro, aditivos reconciliados, LGPD |

## Objetos

- `MatrixDimension`
- `ChecklistItem` — status `CONFORME` | `PARCIAL` | `NAO_CONFORME`
- `ContractQualityScorecard` — `overallScore`, `scoreByDimension`, `totalEstimatedSavings`, `improvementPoints`

## Checklist mínimo

≥ 16 pontos de controle (4+ por dimensão) específicos de Saúde Suplementar.

## Integração

- Simulação: `DemoProviderProfile.qualityScorecard`
- Dashboard futuro: painel 4 pilares (Prompt UI)
- Não misturar fixtures de simulação em treino REAL
