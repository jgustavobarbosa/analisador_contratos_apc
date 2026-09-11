# src/ — target package layout

Runtime atual permanece em `apps/api` e `apps/web`. Este diretório é o **scaffold alvo** para extrair módulos sem misturar TRACK REAL e TRACK SIMULATION.

| Path | Track | Conteúdo |
|---|---|---|
| `core/` | REAL | Ingestão, dossiê, schemas |
| `ml/` | REAL | Glosa + otimização de processo |
| `api/` | REAL | Contratos PaaS multi-tenant |
| `simulation/` | SIMULATION | Fixtures TISS/TUSS + generators |

Ver `.cursorrules`.
