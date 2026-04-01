#!/usr/bin/env bash
# Упаковка проекта и выкладка на сервер по SSH.
#
# Переменные окружения:
#   DEPLOY_HOST          user@host (по умолчанию root@155.212.134.183)
#   DEPLOY_SSH_PORT      порт SSH (по умолчанию 22)
#   DEPLOY_SSH_KEY        путь к приватному ключу (рекомендуется ed25519)
#   DEPLOY_SSH_KEY_CONTENT  текст ключа (для CI/Cursor Secrets; создаётся временный файл)
#
# Пример:
#   DEPLOY_HOST=root@155.212.134.183 DEPLOY_SSH_KEY=~/.ssh/tradehub_deploy ./scripts/deploy-to-server.sh
#
# Опционально: рядом положить scripts/deploy.env (не коммитится) и:
#   set -a && source "$(dirname "$0")/deploy.env" && set +a && ./scripts/deploy-to-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARCHIVE="/tmp/tradehub-deploy.tar.gz"
REMOTE_HOST="${DEPLOY_HOST:-root@155.212.134.183}"
SSH_PORT="${DEPLOY_SSH_PORT:-22}"

SSH_KEY_FILE=""
TMPKEY=""
cleanup_key() {
	[ -n "${TMPKEY:-}" ] && rm -f "$TMPKEY"
}
trap cleanup_key EXIT

if [ -n "${DEPLOY_SSH_KEY_CONTENT:-}" ]; then
	TMPKEY="$(mktemp "${TMPDIR:-/tmp}/tradehub_ssh.XXXXXX")"
	chmod 600 "$TMPKEY"
	printf '%b' "$DEPLOY_SSH_KEY_CONTENT" >"$TMPKEY"
	SSH_KEY_FILE="$TMPKEY"
elif [ -n "${DEPLOY_SSH_KEY:-}" ]; then
	SSH_KEY_FILE="${DEPLOY_SSH_KEY/#\~/$HOME}"
fi

# BatchMode: без запроса пароля в терминале (удобно для агента/CI). Отключить: DEPLOY_SSH_BATCH=no
SSH_BATCH_OPTS=()
if [ "${DEPLOY_SSH_BATCH:-yes}" != "no" ]; then
	SSH_BATCH_OPTS=(-o BatchMode=yes)
fi

SCP_BASE=(scp "${SSH_BATCH_OPTS[@]}" -o StrictHostKeyChecking=accept-new)
SSH_BASE=(ssh "${SSH_BATCH_OPTS[@]}" -o StrictHostKeyChecking=accept-new)
if [ "$SSH_PORT" != "22" ]; then
	SCP_BASE+=(-P "$SSH_PORT")
	SSH_BASE+=(-p "$SSH_PORT")
fi
if [ -n "$SSH_KEY_FILE" ]; then
	if [ ! -f "$SSH_KEY_FILE" ]; then
		echo "DEPLOY_SSH_KEY: файл не найден: $SSH_KEY_FILE" >&2
		exit 1
	fi
	SCP_BASE+=(-i "$SSH_KEY_FILE")
	SSH_BASE+=(-i "$SSH_KEY_FILE")
fi

REMOTE_USER="${REMOTE_HOST%%@*}"
if [ "$REMOTE_USER" = "root" ]; then
	REMOTE_SHELL='cp /tmp/tradehub-deploy.tar.gz /root/tradehub-deploy.tar.gz && bash -s'
else
	REMOTE_SHELL='sudo cp /tmp/tradehub-deploy.tar.gz /root/tradehub-deploy.tar.gz && sudo bash -s'
fi

echo "→ Сборка архива из $ROOT ..."
tar --exclude='tradehub/node_modules' \
	--exclude='tradehub/.svelte-kit' \
	--exclude='tradehub/build' \
	-czf "$ARCHIVE" \
	-C "$ROOT" tradehub

echo "→ Копирование на $REMOTE_HOST (порт $SSH_PORT) ..."
"${SCP_BASE[@]}" "$ARCHIVE" "$REMOTE_HOST:/tmp/tradehub-deploy.tar.gz"

echo "→ Запуск remote-deploy на сервере ..."
"${SSH_BASE[@]}" "$REMOTE_HOST" "$REMOTE_SHELL" <"$ROOT/tradehub/scripts/remote-deploy.sh"

echo "→ Готово."
