# Deploy VPS — acesso players (isolado do SOAI)

**Status:** **no ar** (2026-09-12) — Front+API em `https://rayia-contratos.duckdns.org`  
**VPS:** `143.95.219.149` (Hostinger / HostGator) · SSH `:22022` · Ubuntu 22.04  
**Objetivo:** subir o Analisador de Contratos (RAY.IA) para players testarem **sem alterar** SOAI, Hermes, Postgres `soai_prod` nem vhosts atuais.

### Acesso players (operação)

| Item | Valor |
|---|---|
| URL | https://rayia-contratos.duckdns.org |
| Login seed | `players@rayia.demo` (senha em `/root/.config/rayia-contratos/PLAYERS.txt` na VPS) |
| Código | `/opt/analisador_contratos_planos` |
| PM2 | `rayia-contratos-api` · porta `3001` · teto 512M |
| DB | `rayia_contratos` (isolado de `soai_prod`) |
| Nginx | `/etc/nginx/sites-available/rayia-contratos` |
| TLS | Let's Encrypt via snap certbot (webroot) |

SOAI permanece em https://soiaia.duckdns.org.

### Atualização automática a partir do `main`

Fluxo oficial:

1. Alterar no Mac → `git push origin main`
2. A VPS detecta o novo commit (timer systemd a cada **2 min**) e roda `scripts/deploy-vps.sh`
3. Opcional: GitHub Actions (`.github/workflows/deploy-vps.yml`) dispara no push se os secrets `VPS_*` estiverem configurados

Comandos na VPS:

```bash
# deploy manual
/opt/analisador_contratos_planos/scripts/deploy-vps.sh

# status do auto-deploy
systemctl status rayia-contratos-autodeploy.timer
journalctl -u rayia-contratos-autodeploy.service -n 50
```

O clone em `/opt/analisador_contratos_planos` rastreia **`origin/main`**. `.env` não é sobrescrito (está no `.gitignore`).

---

## 1. O que já está online (não tocar)

| Serviço | Path / processo | Porta | Banco / DNS |
|---|---|---|---|
| **SOAI** (Next.js) | PM2 `soai-app` · `/opt/soai` | `3000` | DB `soai_prod` · nginx `soai` |
| **rayia-api** (Python/FastAPI) | PM2 `rayia-api` · `/opt/ray/api-rayia-cross` | `8081` → nginx `:8080` | — |
| Hermes gateway | systemd `hermes-gateway` · `/opt/ray/hermes-agent` | — | — |
| MCP health | systemd · `/opt/ray/mcp-health-server` | `8000` localhost | — |
| Postgres 16 | systemd | `5432` localhost | só `soai_prod` (+ templates) |
| Público | nginx 80/443 | | `soiaia.duckdns.org` + IP → SOAI |

**Regra de ouro:** não editar `/opt/soai`, não restartar `soai-app`/`rayia-api` a menos que falhe um healthcheck pós-deploy, não alterar `soai_prod`, não reusar porta `3000`/`8081`/`8080`, não sobrescrever o `server_name` do vhost `soai`.

---

## 2. Capacidade (medição 2026-09-11)

| Recurso | Valor | Implicação |
|---|---|---|
| RAM | **3,8 GiB** total · ~**1,9 GiB** available | Teto API Nest ≤ **512 MiB** (PM2 `max_memory_restart`) |
| Swap | **0** | Evitar OOM: sem OCR/LLM local; sem Playwright neste host para o analisador |
| Disco | 98 G · **82 G livres** | OK para repo + uploads leves |
| Node | v20.20.2 | OK; instalar **pnpm** se faltar |
| Portas livres | `3001`, `3010`, `5180`, `8088`, `9000` | API no **`3001`** |

Se `available` cair &lt; ~1,2 GiB antes do install, **pausar** e liberar (ex.: scrapers Playwright pontuais) antes de subir o Nest.

---

## 3. Arquitetura alvo (isolamento)

### DNS DuckDNS — limitação importante

DuckDNS **não** aceita hostname aninhado (`contratos.soiaia.duckdns.org`).  
Só um rótulo: `A-Z`, `0-9`, `-` → formato `meu-nome.duckdns.org`.

Por isso o acesso players usa **outro hostname DuckDNS** (conta nova ou domínio extra na mesma conta), apontando para o **mesmo IP** `143.95.219.149`.

```
Internet
   │
   ├─ https://soiaia.duckdns.org/              → SOAI (inalterado)
   ├─ https://soiaia.duckdns.org/api/...       → SOAI / rayia-api Python (inalterado)
   │
   └─ https://rayia-contratos.duckdns.org/     ← NOVO hostname DuckDNS (ex.)
         ├─ /            → estáticos Vite (apps/web/dist)
         └─ /api/        → NestJS 127.0.0.1:3001
```

**Sugestões de nome (escolher um livre no DuckDNS):**

| Hostname | Notas |
|---|---|
| `rayia-contratos.duckdns.org` | preferido (claro para players) |
| `analisador-contratos.duckdns.org` | ok se o primeiro estiver ocupado |
| `rayia-apc.duckdns.org` | curto |

**Alternativa B (sem DNS novo):** path no mesmo domínio — `https://soiaia.duckdns.org/contratos/` + API em `/contratos-api/` — exige editar o vhost `soai` com cuidado (mais risco de colisão com `/api/`). Só se não der para criar segundo DuckDNS.

| Item | Valor isolado |
|---|---|
| Código | `/opt/analisador_contratos_planos` (clone git; **não** dentro de `/opt/soai` nem `/opt/ray`) |
| PM2 | nome `rayia-contratos-api` (≠ `rayia-api`) |
| Porta API | `127.0.0.1:3001` |
| Postgres | role `rayia_contratos` + DB `rayia_contratos` (novo) |
| Nginx | arquivo **novo** `sites-available/rayia-contratos` |
| TLS | certbot para o **novo** `*.duckdns.org` (ex. `rayia-contratos.duckdns.org`) |
| Track | players = **SIMULATION** + seed demo; header/UI `[Modo Simulação Ativo]` |
| Front+API | ambos na VPS (sem depender do Vercel para players) |

---

## 4. Fases (ordem segura)

### Fase 0 — Pré-voo (somente leitura / DNS)

1. Confirmar `pm2 list`: `soai-app` + `rayia-api` online.  
2. No DuckDNS: criar domínio **novo** (ex. `rayia-contratos`) → IP `143.95.219.149` (não usar `contratos.soiaia...`).  
3. Aguardar resolução DNS (`dig +short rayia-contratos.duckdns.org`).  
4. Decidir: seed demo com usuários de teste (senhas **não** default de prod).

### Fase 1 — Postgres novo (zero impacto em `soai_prod`)

```bash
sudo -u postgres createuser -P rayia_contratos   # senha forte nova
sudo -u postgres createdb -O rayia_contratos rayia_contratos
# NÃO alterar postgresql.conf / shared_buffers
```

Aceite: `\l` mostra `rayia_contratos`; `soai_prod` intacto.

### Fase 2 — Código + build (pasta nova)

```bash
cd /opt
git clone <repo> analisador_contratos_planos
# ou rsync a partir do Mac
corepack enable && corepack prepare pnpm@latest --activate
cd /opt/analisador_contratos_planos
pnpm install --frozen-lockfile
# apps/api/.env — só DATABASE_URL do DB novo + SESSION_SECRET + PORT=3001 + CORS
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed   # só no DB novo, track simulation
pnpm --filter api build
pnpm --filter web build
# VITE_API_BASE_URL=https://rayia-contratos.duckdns.org/api  (ou relative /api no mesmo host)
```

### Fase 3 — PM2 (processo novo)

- Script: `node dist/main.js` (ou path Nest build) com `cwd` em `apps/api`.  
- `PORT=3001`, `max_memory_restart: 512M`.  
- `pm2 save` **depois** de validar que `soai-app` / `rayia-api` seguem online.

### Fase 4 — Nginx + TLS (vhost novo)

- `sites-available/rayia-contratos` com `server_name rayia-contratos.duckdns.org` (ou o nome escolhido).  
- `root` = `apps/web/dist`; `location /api/` → `http://127.0.0.1:3001`.  
- `nginx -t` **antes** de reload.  
- `certbot --nginx -d rayia-contratos.duckdns.org`.  
- **Não** editar o arquivo `soai` (vhost separado = zero risco de path `/api/`).

### Fase 5 — Smoke players

1. `https://soiaia.duckdns.org` ainda abre SOAI.  
2. `https://rayia-contratos.duckdns.org` abre login RAY.IA (front+API na VPS).  
3. Login demo + dossiê/simulação.  
4. `curl` health na `:3001` via proxy.  
5. `pm2 list` e `free -h` estáveis.

---

## 5. O que NÃO fazer

- Docker nesta VPS (política atual).  
- Reusar DB `soai_prod` ou role `soai_user`.  
- Expor Postgres `5432` na internet.  
- Colocar API na porta `3000` ou path `/api/` do domínio SOAI.  
- Subir OCR/LLM/Playwright permanente neste host.  
- Commitar `.env` / senhas / `ssh_hosinger` no git.

---

## 6. Rollback rápido

1. `pm2 stop rayia-contratos-api`  
2. Remover symlink do vhost novo + `nginx -t && systemctl reload nginx`  
3. Opcional: `dropdb rayia_contratos` (só o DB novo)  
4. SOAI continua em `/opt/soai` + `soai_prod`

---

## 7. Credenciais / ops

- SSH: chave `~/.ssh/id_ed25519` (`ray-gustavo-mac`) já autorizada; porta **22022**.  
- Senha root existe no arquivo local Desktop (não versionar). Preferir só chave.  
- Secrets da app: só em `/opt/analisador_contratos_planos/apps/api/.env` (chmod 600).

---

## 8. Decisão pendente (humano)

1. **DNS:** criar no DuckDNS um domínio **novo** (ex. `rayia-contratos` → `143.95.219.149`) e informar o nome exato.  
2. **Front+API na VPS:** confirmado — sem Vercel para players.  
3. **Autorizar execução** das Fases 1–5 nesta VPS compartilhada (RAM apertada)?

Após DNS ativo + “sim” na fase 3, executar na ordem acima com healthcheck do SOAI entre cada fase.
