# EPIC-2 — Dossiê vivo (reconciliação contratual)

**Track:** REAL.  
**Spec:** `SPEC-dossier.md`. **Target:** `src/core/dossier/`.

## Objective
Estado reconciliado por vigência, versionado (append-only), cadeia evento→formalização.

## Rules
- Resolve by `effectiveAt`, not upload date
- Four dates: event, notified, signed, effective
- Export JSON with `snapshotHash`

## Case-base
Unimed–Oncoradium PDFs + golden timeline (retroactive vigency, code exclusion, chemo room fees).

## Acceptance
- [x] Golden reconciliation + timeline + export
- [x] Apply accepted extraction fields → new version
- [ ] Full clause graph / multi-prestador dictionaries
