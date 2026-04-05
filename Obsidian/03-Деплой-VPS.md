# Деплой (VPS)

## CI/CD — автодеплой (основной способ)

GitHub Actions: `.github/workflows/deploy.yml` — запускается на push в `main`.

Шаги:
1. `npm ci`
2. `npm run check` (svelte-check, 0 errors)
3. `npm test` (43 unit-теста)
4. `bash tradehub/scripts/deploy-to-server.sh`

**Секреты GitHub** (Settings → Secrets → Actions):

| Секрет | Значение |
|--------|---------|
| `DEPLOY_HOST` | `root@<IP сервера>` |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ (ed25519, однострочный) |

## Деплой вручную (с локальной машины)

```bash
cd /path/to/TradeHub_app
set -a && source tradehub/scripts/deploy.env && set +a
bash tradehub/scripts/deploy-to-server.sh
```

Файл `tradehub/scripts/deploy.env` (не коммитится):
```bash
export DEPLOY_HOST=root@155.212.134.183
export DEPLOY_SSH_KEY="$HOME/.ssh/tradehub_server"
```

## Что делает deploy-to-server.sh

1. Упаковывает `tradehub/` в архив tar (без `node_modules`, `.svelte-kit`, `build`).
2. Копирует на сервер по SCP.
3. Запускает `remote-deploy.sh` на сервере:
   - Бэкап `.env` → `/root/teleposter.env.backup`
   - `rm -rf /opt/teleposter` + распаковка
   - `npm install && npm run build`
   - `drizzle-kit push --force` (если `DATABASE_URL` в `.env`)
   - Установка systemd unit-файлов
   - `systemctl restart teleposter.service`

> **Важно:** macOS создаёт `xattr` атрибуты в архивах — в скрипте они подавляются, на деплой не влияют.

## Пути на сервере

- Приложение: **`/opt/teleposter`**
- Конфиг: **`/opt/teleposter/.env`**
- Nginx конфиги: `teleposter.example.conf`, `barakali.online.conf`

## Systemd сервисы

| Unit | Назначение |
|------|-----------|
| `teleposter.service` | Основной Node-процесс SvelteKit (порт 3000) |
| `teleposter-parser.timer/service` | Парсер Telegram (каждую минуту) |
| `teleposter-checker.timer/service` | Чекер актуальности объявлений (раз в час) |
| `teleposter-dedupe.timer/service` | Дедупликация (раз в 12 часов) |

Подробности: **`tradehub/deploy/BEGET-VPS.md`**.

← [[Teleposter]] · [[04-Парсер-Telegram]]
