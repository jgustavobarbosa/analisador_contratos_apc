# EPIC-1 — Ingestão e extração documental

**Track:** REAL for tenant PDFs; SIMULATION only for synthetic packets under `src/simulation/`.  
**Code today:** `apps/api` dossier upload + assisted extract + review queue.  
**Target package:** `src/core/ingestion/`.

## Objective
Transformar contrato/aditivo/carta/comunicado em campos estruturados com confiança e revisão humana.

## Capabilities
- Upload + checksum + storage local
- Extração assistida (JSON); OCR/LLM local = próximo incremento
- Fila `pending_review` → accept/reject antes do dossiê

## Provider differentiation
Dictionary of expected fields varies by hospital / clinic / home care / lab / oncology — generators in SIMULATION mirror these shapes without PII.

## Acceptance
- [x] Upload + evidence metadata
- [x] Assisted extract + review
- [ ] Production OCR/LLM pipeline local-first
