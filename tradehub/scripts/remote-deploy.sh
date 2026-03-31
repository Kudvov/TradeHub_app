#!/usr/bin/env bash
set -euo pipefail
# Сохранить .env с паролями БД между выкладками
if [ -f /opt/tradehub/.env ]; then
	cp /opt/tradehub/.env /root/tradehub.env.backup
fi
rm -rf /opt/tradehub
tar -xzf /root/tradehub-deploy.tar.gz -C /opt
cd /opt/tradehub
if [ -f /root/tradehub.env.backup ]; then
	cp /root/tradehub.env.backup .env
else
	cp -n .env.example .env || true
fi
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

# Веб-приложение (Node, порт 3000, за nginx)
if [ -f deploy/systemd/tradehub.service ]; then
	install -m 644 deploy/systemd/tradehub.service /etc/systemd/system/
fi

# Парсер Telegram: systemd timer (каждые ~30 мин после предыдущего запуска)
if [ -f deploy/systemd/tradehub-parser.service ]; then
	install -m 644 deploy/systemd/tradehub-parser.service /etc/systemd/system/
	install -m 644 deploy/systemd/tradehub-parser.timer /etc/systemd/system/
fi

systemctl daemon-reload
systemctl enable tradehub.service
systemctl restart tradehub.service
if [ -f /etc/systemd/system/tradehub-parser.timer ]; then
	systemctl enable tradehub-parser.timer
	systemctl restart tradehub-parser.timer
	echo "→ tradehub-parser.timer: $(systemctl is-active tradehub-parser.timer || true)"
fi

sleep 2
echo "→ tradehub.service: $(systemctl is-active tradehub.service || true)"
curl -s -o /dev/null -w "HTTP :3000 /admin/groups: %{http_code}\n" http://127.0.0.1:3000/admin/groups || true
curl -s -o /dev/null -w "HTTP :80 /admin/groups (nginx): %{http_code}\n" http://127.0.0.1/admin/groups || true
