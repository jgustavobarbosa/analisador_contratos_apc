# EPIC-7 — Plataforma PaaS (multi-tenant)

**Track:** REAL control plane + isolated data planes.  
**Target:** `src/api/`.  
**Status:** Not in MVP 0–6 delivery — scaffolding only.

## Objective
Provisionamento de tenant, API pública, conectores, billing de uso, console admin.

## Principles
- Control plane never receives raw contract/guide/beneficiary payloads
- RLS / schema isolation on PostgreSQL

## Acceptance
- [ ] Tenant provision API
- [ ] Public OpenAPI + API keys
- [ ] Usage metering
