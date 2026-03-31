#!/usr/bin/env bash
set -euo pipefail
rm -rf /opt/tradehub
tar -xzf /root/tradehub-deploy.tar.gz -C /opt
cd /opt/tradehub
cp -n .env.example .env || true
python3 - <<'PY'
from pathlib import Path
import secrets
p = Path('.env')
text = p.read_text() if p.exists() else ''
if 'ADMIN_KEY=' not in text:
    key = secrets.token_hex(24)
    sep = '\n' if text and not text.endswith('\n') else ''
    p.write_text(text + sep + f'ADMIN_KEY={key}\n')
PY
npm install
npm run build

# Схема БД (если DATABASE_URL в .env корректен)
if grep -qE '^DATABASE_URL=(postgres|postgresql)://' .env 2>/dev/null; then
	npm run db:push || echo "⚠ db:push не выполнен — проверьте БД и запустите вручную: cd /opt/tradehub && npm run db:push"
fi

# Парсер Telegram: systemd timer (каждые ~30 мин после предыдущего запуска)
if [ -f deploy/systemd/tradehub-parser.service ]; then
	install -m 644 deploy/systemd/tradehub-parser.service /etc/systemd/system/
	install -m 644 deploy/systemd/tradehub-parser.timer /etc/systemd/system/
	systemctl daemon-reload
	systemctl enable tradehub-parser.timer
	systemctl restart tradehub-parser.timer
	echo "→ tradehub-parser.timer:"
	systemctl is-active tradehub-parser.timer || true
	systemctl is-enabled tradehub-parser.timer || true
fi

systemctl restart tradehub
sleep 2
systemctl is-active tradehub
curl -s -o /dev/null -w "HTTP /admin/groups: %{http_code}\n" http://127.0.0.1/admin/groups
