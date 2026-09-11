# EPIC-0 — Identity

**Track:** REAL (auth never uses simulation identities for production tenants).  
**Status:** MVP delivered in `apps/api` + UI users in `apps/web`.  
**Spec canônica:** `SPEC-identity.md` (raiz).

## Objective
Login/logout, recuperação de senha, RBAC, CRUD usuários/organização.

## Contracts
- Session cookie HttpOnly; Argon2id; permissions `user:*`, `org:*`, …
- Roles: admin, juridico, faturamento, compliance, auditoria, diretoria, somente_leitura

## Acceptance
- [x] Login/reset/RBAC/CRUD API + UI admin
- [ ] MFA / SSO (V1+)
