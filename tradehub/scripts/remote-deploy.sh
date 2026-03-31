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
systemctl restart tradehub
sleep 2
systemctl is-active tradehub
curl -s -o /dev/null -w "HTTP /admin/groups: %{http_code}\n" http://127.0.0.1/admin/groups
