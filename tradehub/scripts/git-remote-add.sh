#!/usr/bin/env bash
# Подключение origin и первый push. Репозиторий на GitHub/GitLab создай пустым (без README), либо потом: git pull --rebase origin main
set -euo pipefail
if [ "${1:-}" = "" ]; then
	echo "Использование: $0 <url-репозитория>"
	echo "Примеры:"
	echo "  $0 git@github.com:USERNAME/TradeHub_app.git"
	echo "  $0 https://github.com/USERNAME/TradeHub_app.git"
	exit 1
fi
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
git remote remove origin 2>/dev/null || true
git remote add origin "$1"
echo "→ remotes:"
git remote -v
echo "→ push:"
git push -u origin main
