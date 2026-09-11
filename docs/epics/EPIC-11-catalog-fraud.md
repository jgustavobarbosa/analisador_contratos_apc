# EPIC-11 — Banco Unificado de Insumos/Serviços & Central Antifraude

**Module id:** `catalog-fraud-engine`  
**Track:** REAL catalog + SIMULATION abuse patterns for demo.  
**Depends on:** ingestion, ml-glosa  
**Status:** Spec scaffold — alert badges prepared; engine pending Prompt 2+.

## Objective
De-para TUSS/TISS/OPME, linkagem com insumos e medicamentos, detecção de padrões abusivos: unbundling, cobrança duplicada, superdimensionamento de diárias/gases, incompatibilidade clínica.

## Acceptance (target)
- [x] Unified code crosswalk model (TUSS/TISS/Brasíndice/SIMPRO/ANVISA)
- [x] Price outlier >15% vs peer median + unbundling detection
- [x] Combined fraud rules (burst, auth mismatch, porte×diárias) with severity
- [ ] Persist crosswalk in Postgres + human review before blocking claims
