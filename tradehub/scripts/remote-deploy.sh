#!/usr/bin/env bash
set -euo pipefail
# Сохранить .env с паролями БД между выкладками
if [ -f /opt/teleposter/.env ]; then
	cp /opt/teleposter/.env /root/teleposter.env.backup
elif [ -f /opt/tradehub/.env ]; then
	cp /opt/tradehub/.env /root/teleposter.env.backup
fi
rm -rf /opt/teleposter /opt/tradehub
tar -xzf /root/teleposter-deploy.tar.gz -C /opt
mv /opt/tradehub /opt/teleposter
cd /opt/teleposter
if [ -f /root/teleposter.env.backup ]; then
	cp /root/teleposter.env.backup .env
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
# --force автоматически подтверждает все изменения без интерактивного TTY
if grep -qE '^DATABASE_URL=(postgres|postgresql)://' .env 2>/dev/null; then
	npx drizzle-kit push --force || echo "⚠ db:push не выполнен — запустите вручную: cd /opt/teleposter && npx drizzle-kit push --force"
fi

# Веб-приложение (Node, порт 3000, за nginx)
if [ -f deploy/systemd/teleposter.service ]; then
	install -m 644 deploy/systemd/teleposter.service /etc/systemd/system/
fi

# Парсер Telegram: systemd timer (каждую минуту после предыдущего запуска; см. teleposter-parser.timer)
if [ -f deploy/systemd/teleposter-parser.service ]; then
	install -m 644 deploy/systemd/teleposter-parser.service /etc/systemd/system/
	install -m 644 deploy/systemd/teleposter-parser.timer /etc/systemd/system/
fi

# Чекер актуальности объявлений: systemd timer (раз в час)
if [ -f deploy/systemd/teleposter-checker.service ]; then
	install -m 644 deploy/systemd/teleposter-checker.service /etc/systemd/system/
	install -m 644 deploy/systemd/teleposter-checker.timer /etc/systemd/system/
fi

# Дедупликация в БД (раз в 12 ч): content_hash, контакт+заголовок, цена+первое фото
if [ -f deploy/systemd/teleposter-dedupe.service ]; then
	install -m 644 deploy/systemd/teleposter-dedupe.service /etc/systemd/system/
	install -m 644 deploy/systemd/teleposter-dedupe.timer /etc/systemd/system/
fi

systemctl daemon-reload
systemctl enable teleposter.service
systemctl restart teleposter.service
if [ -f /etc/systemd/system/teleposter-parser.timer ]; then
	systemctl enable teleposter-parser.timer
	systemctl restart teleposter-parser.timer
	echo "→ teleposter-parser.timer: $(systemctl is-active teleposter-parser.timer || true)"
fi
if [ -f /etc/systemd/system/teleposter-checker.timer ]; then
	systemctl enable teleposter-checker.timer
	systemctl restart teleposter-checker.timer
	echo "→ teleposter-checker.timer: $(systemctl is-active teleposter-checker.timer || true)"
fi
if [ -f /etc/systemd/system/teleposter-dedupe.timer ]; then
	systemctl enable teleposter-dedupe.timer
	systemctl restart teleposter-dedupe.timer
	echo "→ teleposter-dedupe.timer: $(systemctl is-active teleposter-dedupe.timer || true)"
fi

sleep 2
echo "→ teleposter.service: $(systemctl is-active teleposter.service || true)"
curl -s -o /dev/null -w "HTTP :3000 /admin/groups: %{http_code}\n" http://127.0.0.1:3000/admin/groups || true
curl -s -o /dev/null -w "HTTPS teleposter.online /admin/groups: %{http_code}\n" https://teleposter.online/admin/groups || true
