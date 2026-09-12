#!/usr/bin/env bash
# Deploy seguro do Analisador (RAY.IA) na VPS compartilhada.
# NÃO toca /opt/soai, /opt/ray, soai_prod nem outros PM2 apps.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/analisador_contratos_planos}"
PM2_NAME="${PM2_NAME:-rayia-contratos-api}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-https://rayia-contratos.duckdns.org/health}"
SOAI_URL="${SOAI_URL:-https://soiaia.duckdns.org/}"

log() { printf '[deploy-vps] %s\n' "$*"; }

cd "$APP_ROOT"

if [[ ! -d .git ]]; then
  log "ERRO: $APP_ROOT não é um clone git"
  exit 1
fi

# Preservar secrets (gitignore)
if [[ ! -f apps/api/.env ]]; then
  log "ERRO: apps/api/.env ausente — abortando"
  exit 1
fi

log "Verificando SOAI antes do deploy..."
curl -sS -o /dev/null -w "soai_pre:%{http_code}\n" --connect-timeout 8 "$SOAI_URL" || true

BEFORE="$(git rev-parse HEAD)"
log "HEAD atual: $BEFORE"

git fetch --prune origin "$BRANCH"
TARGET="$(git rev-parse "origin/$BRANCH")"
log "origin/$BRANCH: $TARGET"

if [[ "$BEFORE" == "$TARGET" && "${FORCE_DEPLOY:-0}" != "1" ]]; then
  log "Já atualizado — nada a fazer"
  exit 0
fi

log "Atualizando working tree para origin/$BRANCH..."
git reset --hard "origin/$BRANCH"

# Garantir pnpm 9 no Node 20 (não ativar pnpm 11 via corepack)
export CI=1
hash -r
if ! command -v pnpm >/dev/null; then
  npm install -g pnpm@9.15.9 --force
fi
PNPM_V="$(pnpm -v | cut -d. -f1)"
if [[ "$PNPM_V" -ge 11 ]]; then
  log "pnpm >=11 incompatível com Node 20 — forçando 9.15.9"
  npm install -g pnpm@9.15.9 --force
  hash -r
fi

log "pnpm install..."
pnpm install --frozen-lockfile

log "prisma generate + migrate..."
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate deploy

log "build api + web..."
pnpm --filter api build
pnpm --filter web build

test -f apps/api/dist/src/main.js || test -f apps/api/dist/main.js

log "Reiniciando PM2 $PM2_NAME..."
pm2 describe "$PM2_NAME" >/dev/null 2>&1 \
  && pm2 restart "$PM2_NAME" --update-env \
  || pm2 start "$APP_ROOT/ecosystem.rayia-contratos.config.cjs"
pm2 save

sleep 3
curl -sS -o /dev/null -w "health:%{http_code}\n" --connect-timeout 10 "$HEALTH_URL"
curl -sS --connect-timeout 10 "$HEALTH_URL" || true
echo
curl -sS -o /dev/null -w "soai_post:%{http_code}\n" --connect-timeout 8 "$SOAI_URL" || true

AFTER="$(git rev-parse --short HEAD)"
log "Deploy OK → $AFTER"
pm2 list | grep -E "soai-app|rayia-api|rayia-contratos-api" || pm2 list
