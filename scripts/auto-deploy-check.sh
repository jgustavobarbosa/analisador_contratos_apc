#!/usr/bin/env bash
# Verifica se origin/main avançou e dispara deploy-vps.sh.
# Usado por systemd timer na VPS (sem depender de secrets do GitHub).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/analisador_contratos_planos}"
BRANCH="${BRANCH:-main}"
LOCK="/tmp/rayia-contratos-auto-deploy.lock"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[auto-deploy] outro deploy em andamento — saindo"
  exit 0
fi

cd "$APP_ROOT"
git fetch --prune origin "$BRANCH" >/dev/null 2>&1 || exit 0
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
if [[ "$LOCAL" == "$REMOTE" ]]; then
  exit 0
fi

echo "[auto-deploy] $LOCAL → $REMOTE"
exec "$APP_ROOT/scripts/deploy-vps.sh"
