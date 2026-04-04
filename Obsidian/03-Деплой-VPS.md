# Деплой (VPS)

## Скрипт

Из корня репозитория (родитель `tradehub/`):

```bash
# опционально: tradehub/scripts/deploy.env (не коммитится) — DEPLOY_HOST, DEPLOY_SSH_KEY, DEPLOY_SSH_PORT и т.д.
cd /path/to/TradeHub_app && set -a && source tradehub/scripts/deploy.env && set +a && bash tradehub/scripts/deploy-to-server.sh
```

Или без файла: `DEPLOY_HOST=root@ВАШ_IP DEPLOY_SSH_KEY=~/.ssh/ключ bash tradehub/scripts/deploy-to-server.sh`.

**Переменные** (см. комментарии в `deploy-to-server.sh` и `deploy-env.example`):

| Переменная | Назначение |
|------------|------------|
| `DEPLOY_HOST` | `user@host` (значение по умолчанию см. в `deploy-to-server.sh` — задай `DEPLOY_HOST` для своего сервера) |
| `DEPLOY_SSH_PORT` | Порт SSH (по умолчанию 22) |
| `DEPLOY_SSH_KEY` | Путь к приватному ключу |
| `DEPLOY_SSH_KEY_CONTENT` | Текст ключа (CI / секреты Cursor) |
| `DEPLOY_SSH_BATCH=no` | Если нужен интерактивный ввод пароля SSH вместо ключа |

Скрипт:

1. Упаковывает каталог `tradehub` в архив (`tar`). На macOS возможны предупреждения `LIBARCHIVE.xattr...` — на содержимое деплоя не влияют; при желании: `export COPYFILE_DISABLE=1` перед запуском.
2. Копирует на сервер по SSH (`scp`).
3. На сервере выполняет `tradehub/scripts/remote-deploy.sh`: распаковка в `/opt`, переименование **`/opt/tradehub` → `/opt/teleposter`**, бэкап старого `.env` в **`/root/teleposter.env.backup`**, затем `npm install`, `npm run build`, при наличии `DATABASE_URL` — `db:push`, установка unit-файлов systemd, перезапуск сервисов.

## Пути на сервере

- Приложение: **`/opt/teleposter`**
- Конфиг окружения: **`/opt/teleposter/.env`** (между выкладками подставляется из бэкапа)
- Nginx: примеры в репозитории — `teleposter.example.conf` (старт), **`barakali.online.conf`** (домен + редирект www), прокси на `127.0.0.1:3000`

## Systemd

- **`teleposter.service`** — основной Node-процесс SvelteKit.
- **`teleposter-parser.timer`** + **`teleposter-parser.service`** — периодический запуск `npm run parser:sync` с блокировкой `flock`, чтобы не было параллельных прогонов.

Подробности: **`tradehub/deploy/BEGET-VPS.md`** (DNS, HTTPS Let’s Encrypt, таблица типичных проблем). Юниты: `tradehub/deploy/systemd/*.service`.

## Таймаут парсера

В unit-файле парсера задан **`TimeoutStartSec`** (несколько часов), иначе длинный прогон обрезается по `systemd`.

← [[Teleposter]] · см. [[04-Парсер-Telegram]]
