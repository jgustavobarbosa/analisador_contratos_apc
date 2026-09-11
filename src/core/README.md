# src/core — TRACK REAL

Ingestão, dossiê vivo, contratos de schema e analytics de negócio.

- `ingestion/` — upload, checksum, OCR/LLM hooks, review queue bridges
- `dossier/` — vigency reconciliation, versions, export
- `schemas/` — shared Zod/TS types for REAL payloads
- `analytics/` — **EPIC-10** benchmark + **EPIC-11** catálogo/antifraude

Hoje identity/dossier ainda vivem em `apps/api/src/modules/*`. Analytics já está em `src/core/analytics` (symlink na API).
