# EPIC-6 — Painel de rastreabilidade e auditoria

**Track:** REAL for production audit; SIMULATION may emit demo audit events tagged `track=simulation`.

## Objective
Timeline do contrato + trilha de decisões (auth, dossier, simulation, compliance).

## Current
- Timeline API/UI
- `GET /audit-trail` via AuthAuditEvent actions

## Acceptance
- [x] Timeline + audit list in UI
- [ ] Immutable log store / export for jurídico & diretoria packs
