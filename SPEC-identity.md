# Spec: identity

## Objective

Prover autenticação, autorização (RBAC), recuperação de senha e CRUDs de usuários/organização/papéis para o Analisador Preditivo de Contratos RAY.IA, de forma que todo acesso a dossiê, guias e simulação seja atribuível a um usuário autenticado em um tenant.

**Quem usa:** administradores RAY.IA/cliente, jurídico, faturamento, compliance, auditoria, diretoria, somente_leitura.

**Sucesso:** um usuário com papel correto entra, opera só no seu tenant, recupera senha com segurança, e toda ação sensível deixa trilha de auditoria.

## ASSUMPTIONS

1. Web app (API NestJS + painel React); sem mobile nativo nesta fase.
2. Autenticação por **sessão com cookie HttpOnly + Secure + SameSite** no painel; API de integração (ERP) usa **API key por tenant** (fora do escopo mínimo desta spec — só contrato de interface).
3. Hash de senha: **Argon2id** (memory 64MB, iterations 3, parallelism 4).
4. Um usuário pertence a **um tenant** no MVP/PoC (multi-tenant membership fica para V2).
5. E-mail de reset usa provedor configurável (SMTP/SES); em PoC local pode usar Ethereal/Mailhog.
6. MFA TOTP: **fora do MVP mínimo**; obrigatório para `admin` a partir do go-live V1.
7. PostgreSQL + Prisma no plano de dados / control plane conforme arquitetura do plano.

→ Corrigir agora se discordar.

## Tech Stack

| Peça | Escolha |
|---|---|
| API | NestJS + TypeScript |
| ORM | Prisma |
| DB | PostgreSQL |
| Painel | React + TypeScript |
| Hash | `@noble/hashes` Argon2id ou `argon2` nativo |
| Sessão | `iron-session` / cookie assinado no servidor Nest, ou sessão em Redis se disponível |
| Testes | Vitest/Jest (unit) + Supertest (API) + Playwright (fluxo login/reset) |

Versões exatas serão fixadas no bootstrap do monorepo (Task 0.4).

## Commands (alvo pós-bootstrap)

```
Dev API:     pnpm --filter api dev
Dev Web:     pnpm --filter web dev
Test:        pnpm --filter api test -- --coverage
Test e2e:    pnpm --filter web test:e2e
Lint:        pnpm lint
Migrate:     pnpm --filter api prisma migrate dev
```

## Project Structure (módulo)

```
apps/api/src/modules/identity/
  auth/           → login, logout, session, password-reset
  users/          → CRUD usuários
  roles/          → papéis e permissões
  organizations/  → CRUD org vinculada ao tenant
  audit/          → eventos de autenticação/autorização
apps/web/src/features/auth/
  LoginPage, ResetPasswordPage, UsersAdminPage
tests/identity/   → unit + integration
e2e/auth/         → login, reset, RBAC denial
docs/SPEC-identity.md  → esta spec (cópia canônica na raiz: SPEC-identity.md)
```

## Domain model (mínimo)

| Entidade | Campos-chave |
|---|---|
| `Organization` | id, tenantId, legalName, document (CNPJ), type (`prestador`\|`operadora`), createdAt |
| `User` | id, tenantId, organizationId, email, passwordHash, status (`active`\|`disabled`), roleId, createdAt, lastLoginAt |
| `Role` | id, tenantId nullable (roles sistema), code, name |
| `Permission` | code (ex.: `dossier:read`, `user:write`, `simulation:run`) |
| `RolePermission` | roleId, permissionId |
| `Session` | id, userId, tokenHash, expiresAt, ip, userAgent, revokedAt |
| `PasswordResetToken` | id, userId, tokenHash, expiresAt, usedAt |
| `AuthAuditEvent` | id, tenantId, actorUserId, action, target, ip, createdAt, metadata |

### Papéis padrão (seed)

| code | Permissões típicas |
|---|---|
| `admin` | todas do tenant |
| `juridico` | dossier read/write review, export, timeline |
| `faturamento` | simulation run, dossier read, guide batch |
| `compliance` | compliance read/write, dossier read |
| `auditoria` | dossier read, audit trail read, simulation read |
| `diretoria` | dashboards read, export reports |
| `somente_leitura` | reads sem export sensível configurável |

## Fluxos

### UC-AUTH-01 — Login

1. Usuário informa e-mail + senha.
2. Sistema valida credenciais; em falha, incrementa contador e responde mensagem genérica.
3. Em sucesso, cria sessão, seta cookie, registra `login_success`.
4. Redireciona ao painel conforme papel.

**Alternativo:** após N falhas (ex.: 5 / 15 min), bloqueio temporário + `login_locked`.

### UC-AUTH-02 — Recuperação de senha

1. Usuário solicita reset com e-mail.
2. Sistema sempre responde 202 genérico (não revela existência).
3. Se usuário ativo existir, gera token one-time (TTL 30 min), envia link.
4. Usuário define nova senha (política mínima); token marcado `usedAt`; sessões anteriores revogadas.
5. Audit: `password_reset_requested` / `password_reset_completed`.

### UC-AUTH-03 — Gestão de perfis e usuários

1. `admin` lista/cria/edita/desativa usuários do próprio tenant.
2. Atribui exatamente um papel da lista seed (custom roles = V2).
3. Não pode remover o último `admin` ativo do tenant.
4. Reset forçado pelo admin invalida sessões e dispara fluxo de definição de senha.

### UC-AUTH-04 — Logout

Revoga sessão corrente; cookie limpo; audit `logout`.

## API (contrato preliminar)

| Método | Path | Auth | Notas |
|---|---|---|---|
| POST | `/auth/login` | public | rate limit |
| POST | `/auth/logout` | session | |
| POST | `/auth/password-reset/request` | public | rate limit |
| POST | `/auth/password-reset/confirm` | token | |
| GET | `/me` | session | user + role + permissions |
| GET/POST | `/users` | `user:write` / `user:read` | |
| PATCH | `/users/:id` | `user:write` | |
| POST | `/users/:id/disable` | `user:write` | |
| GET | `/roles` | `user:read` | |
| GET/PATCH | `/organizations/me` | `org:read` / `org:write` | |

Todas as rotas autenticadas exigem `tenantId` da sessão; queries filtradas por tenant no servidor.

## Code Style

```ts
// Exemplo de gate de permissão — sempre no servidor
@RequirePermissions('user:write')
@Patch('users/:id')
async updateUser(
  @TenantId() tenantId: string,
  @Param('id') userId: string,
  @Body() dto: UpdateUserDto,
  @CurrentUser() actor: AuthUser,
) {
  return this.users.updateInTenant(tenantId, userId, dto, actor);
}
```

- DTOs com class-validator / zod; rejeitar campos extras.
- IDs opacos (ULID/UUID); nunca confiar em `tenantId` do body.
- Mensagens de erro de auth genéricas para o cliente; detalhe só no audit/log interno.

## Testing Strategy

| Nível | Casos |
|---|---|
| Unit | Argon2id hash/verify; política de senha; expiração de token; “último admin” |
| Integration | login → `/me`; reset completo; usuário desativado não autentica; IDOR cross-tenant |
| E2E | login feliz; falha genérica; reset; admin cria usuário e novo login |
| Segurança | rate limit; session fixation; cookie flags; enumeração de e-mail |

Cobertura alvo do módulo identity: ≥ 80% linhas nos serviços de auth/users.

## Boundaries

- **Always:** validar input; filtrar por tenant; audit em login/reset/CRUD; testes de IDOR no CI.
- **Ask first:** mudar algoritmo de hash; introduzir SSO/OIDC; MFA; alterar papéis seed em produção; Redis vs sessão em DB.
- **Never:** logar senha/token em claro; JWT sem expiração; confiar só em hide/show da UI para autorização; commit de secrets.

## Success Criteria

- [ ] Login/logout com cookie seguro funcionando em staging
- [ ] Reset de senha one-time, TTL 30 min, sessões revogadas
- [ ] RBAC bloqueia rota sem permissão (teste automatizado)
- [ ] CRUD usuários isolado por tenant (teste IDOR vermelho→verde)
- [ ] Audit events persistidos para login, falha, reset, disable
- [ ] Sem revelação se e-mail existe nos endpoints públicos
- [ ] Documentação OpenAPI dos endpoints deste módulo

## Out of scope (esta spec)

- SSO SAML/OIDC
- MFA TOTP
- Membership multi-tenant por usuário
- Billing / API keys de ERP (tenancy + integrações)
- Conteúdo do dossiê

## Open Questions

1. Sessão só em PostgreSQL na PoC ou Redis desde o início?
2. Política de senha mínima (comprimento, complexidade, histórico)?
3. Convite por e-mail vs criação com senha temporária pelo admin?

## Dependencies

- Nenhuma (primeiro módulo).
- Consumido por: `tenancy`, e todos os demais módulos via `RequirePermissions` / `@CurrentUser`.
