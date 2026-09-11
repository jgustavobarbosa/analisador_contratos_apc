# EPIC-3 — Simulador de faturamento / segunda opinião

**Tracks:**
- REAL: simulate against tenant dossier
- SIMULATION: deterministic engines + fixtures in `src/simulation/`

## Objective
Antes do envio da guia: valor esperado, cobertura, alertas, evidência arquivada.

## APIs (current)
- `POST /simulations`, `POST /simulations/batch`, `GET /simulations`
- NFR: &lt; 3s on-demand

## UI
Must show **[Modo Simulação Ativo] / [Produção]** when both tracks are available.

## Acceptance
- [x] On-demand + batch + persisted evidence + risk notes hook
- [ ] ERP webhook integration
- [ ] Full SIMULATION generators per provider type wired to UI toggle
