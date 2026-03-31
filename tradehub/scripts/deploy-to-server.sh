#!/usr/bin/env bash
# Упаковка проекта и выкладка на сервер (нужен ssh + sudo на удалённой машине).
# Использование:
#   ./scripts/deploy-to-server.sh
#   DEPLOY_HOST=user@192.168.1.10 ./scripts/deploy-to-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARCHIVE="/tmp/tradehub-deploy.tar.gz"
# По умолчанию внешний IP сервера; переопределение: DEPLOY_HOST=user@host ./scripts/deploy-to-server.sh
REMOTE_HOST="${DEPLOY_HOST:-kudvov@155.212.134.183}"

echo "→ Сборка архива из $ROOT ..."
tar --exclude='tradehub/node_modules' \
	--exclude='tradehub/.svelte-kit' \
	--exclude='tradehub/build' \
	-czf "$ARCHIVE" \
	-C "$ROOT" tradehub

echo "→ Копирование на $REMOTE_HOST ..."
scp "$ARCHIVE" "$REMOTE_HOST:/tmp/tradehub-deploy.tar.gz"

echo "→ Запуск remote-deploy на сервере (sudo) ..."
ssh "$REMOTE_HOST" 'sudo cp /tmp/tradehub-deploy.tar.gz /root/tradehub-deploy.tar.gz && sudo bash -s' \
	< "$ROOT/tradehub/scripts/remote-deploy.sh"

echo "→ Готово."
