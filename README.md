# Analisador Preditivo de Contratos — RAY.IA

Monorepo PoC: identidade + dossiê vivo (caso Unimed–Oncoradium). Specs: [`SPEC-identity.md`](./SPEC-identity.md), [`SPEC-dossier.md`](./SPEC-dossier.md).

**Fase MVP (épicos 0–6):** [`docs/FASE-MVP-EPIC-0-6.md`](./docs/FASE-MVP-EPIC-0-6.md) · tarefas em [`tasks/todo.md`](./tasks/todo.md).

**Épicos detalhados:** [`docs/epics/`](./docs/epics/) · **Regras permanentes:** [`.cursorrules`](./.cursorrules) (TRACK REAL vs SIMULATION).

**Scaffold alvo:** [`src/`](./src/) (`core`, `ml`, `api`, `simulation`, `app/dashboard`) — runtime em `apps/`.

**Dashboard de auditoria (demo):** aba **Dashboard** em http://localhost:5180 — KPIs, central de alertas, timeline EPIC-6.

**Design system Dark Theme:** [`docs/DESIGN-SYSTEM-RAYIA.md`](./docs/DESIGN-SYSTEM-RAYIA.md) · tokens `ray-*` em `apps/web/tailwind.config.js`.

**MVP para apresentação a parceiros (local):** [`docs/MVP-APRESENTACAO.md`](./docs/MVP-APRESENTACAO.md).

## Stack

| App | Tecnologia |
|---|---|
| `apps/api` | NestJS + Prisma + PostgreSQL |
| `apps/web` | Vite + React + TypeScript (login, usuários, reset, timeline, upload PDF, consulta de preço) |
| Infra PoC (VPS futura) | Bare-metal Node + Postgres (sem Docker obrigatório) |
| Infra opcional (desktop) | `docker compose` só Postgres, se Docker existir |

## Pré-requisitos

- Node.js ≥ 20
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- PostgreSQL acessível (local/Homebrew/Postgres.app **ou** Docker só em máquina de dev)

## Demo local (apresentação)

```bash
cp .env.example apps/api/.env   # se ainda não existir
# DATABASE_URL → Postgres local; SESSION_SECRET forte

pnpm install
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed

# terminal 1
pnpm --filter api start:dev

# terminal 2
pnpm --filter web dev
```

1. Abra http://localhost:5180 (porta fixa no Vite; não usa 5173)
2. Login: `admin@example.com` / `ChangeMeAdmin1!` (ou valores do seed)
3. Aba **Usuários** (admin): criar/desativar/trocar papel
4. **Carregar caso Unimed–Oncoradium** → timeline + consulta `10101012` / taxas de sala
5. No detalhe do contrato: **Enviar PDF** (checksum sha256 curto na lista de documentos)

Uploads ficam em `apps/api/storage/uploads/` (gitignored).

## Testes

```bash
pnpm --filter api test
```

Integração sobe PostgreSQL embutido (**não precisa Docker**).

## VPS

- **Agora:** desenvolvimento e demo **locais** — ver [`docs/MVP-APRESENTACAO.md`](./docs/MVP-APRESENTACAO.md).
- **Depois:** VPS **nova dedicada** (não usar a VPS compartilhada atual). Notas bare-metal: [`docs/VPS-BARE-METAL.md`](./docs/VPS-BARE-METAL.md).

## Módulos

Ordem: identity → dossier (PoC) → … — ver [`CAPABILITY-MAP.md`](./CAPABILITY-MAP.md).
