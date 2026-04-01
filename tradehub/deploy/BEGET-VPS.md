# TradeHub на VPS Beget (Ubuntu)

Цель: сайт на Node за **nginx**, **PostgreSQL**, автопарсер Telegram по таймеру, обновления через **git** или архив с Mac.

## 1. Один раз на сервере

### 1.1 Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v
```

### 1.2 PostgreSQL

```bash
apt-get update
apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER tradehub WITH PASSWORD 'СЛОЖНЫЙ_ПАРОЛЬ';"
sudo -u postgres psql -c "CREATE DATABASE tradehub OWNER tradehub;"
```

### 1.3 Код приложения

**Вариант A — Git (удобно для обновлений):**

```bash
apt-get install -y git
cd /opt
rm -rf tradehub
git clone https://github.com/ВАШ_ЛОГИН/TradeHub_app.git TradeHub_app
# если в репозитории код в подпапке tradehub:
ln -sfn /opt/TradeHub_app/tradehub /opt/tradehub
# или если корень репозитория = само приложение:
# mv нужным образом, главное чтобы /opt/tradehub содержал package.json
```

**Вариант B — как раньше, архив с Mac:** `deploy-to-server.sh` распакует в `/opt/tradehub`.

### 1.4 Файл `/opt/tradehub/.env`

Создайте и заполните (минимум):

```env
DATABASE_URL="postgres://tradehub:СЛОЖНЫЙ_ПАРОЛЬ@127.0.0.1:5432/tradehub?sslmode=disable"
ADMIN_KEY="случайная_длинная_строка"
```

### 1.5 Сборка, схема БД, сиды

```bash
cd /opt/tradehub
npm install
npm run build
npm run db:push
npm run db:seed
```

### 1.6 Systemd (приложение + парсер)

Скопируйте юниты и включите сервисы:

```bash
cd /opt/tradehub
install -m 644 deploy/systemd/tradehub.service /etc/systemd/system/
install -m 644 deploy/systemd/tradehub-parser.service /etc/systemd/system/
install -m 644 deploy/systemd/tradehub-parser.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tradehub.service
systemctl enable --now tradehub-parser.timer
```

Проверка:

```bash
systemctl status tradehub.service --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

### 1.7 Nginx

```bash
apt-get install -y nginx
cp /opt/tradehub/deploy/nginx/tradehub.example.conf /etc/nginx/sites-available/tradehub
ln -sf /etc/nginx/sites-available/tradehub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Откройте в браузере `http://ВАШ_IP/` — должен открыться сайт.

---

## 2. Обновление кода

**Через Git:**

```bash
cd /opt/TradeHub_app   # или /opt/tradehub если это и есть репозиторий
git pull
cd /opt/tradehub
npm install
npm run build
npm run db:push
systemctl restart tradehub.service
```

**С Mac (архив):** `./tradehub/scripts/deploy-to-server.sh` — `remote-deploy.sh` на сервере **сохраняет** старый `.env` в `/root/tradehub.env.backup` перед распаковкой.

**SSH по ключу (удобно для Cursor / CI, без пароля):**

1. На своей машине: `ssh-keygen -t ed25519 -f ~/.ssh/tradehub_deploy -N ""`
2. На сервере под root: `mkdir -p ~/.ssh && chmod 700 ~/.ssh` и добавь строку из `~/.ssh/tradehub_deploy.pub` в `~/.ssh/authorized_keys`, затем `chmod 600 ~/.ssh/authorized_keys`
3. Деплой:  
   `DEPLOY_HOST=root@ВАШ_IP DEPLOY_SSH_KEY=~/.ssh/tradehub_deploy bash tradehub/scripts/deploy-to-server.sh`  
   Параметры см. в `tradehub/scripts/deploy-env.example` (порт `DEPLOY_SSH_PORT`, ключ из переменной `DEPLOY_SSH_KEY_CONTENT` для секретов в Cursor).

---

## 3. Живые объявления

1. Зайдите на **`/admin/groups`** (при необходимости ограничьте доступ в nginx по IP).
2. Добавьте публичные группы `t.me/...`.
3. Парсер уже по таймеру; разовый запуск:  
   `systemctl start tradehub-parser.service`  
4. Логи: `journalctl -u tradehub-parser.service -f`

---

## 4. Типичные проблемы

| Симптом | Действие |
|--------|----------|
| 502 от nginx | `systemctl status tradehub` — упал Node; смотрите `journalctl -u tradehub -n 50` |
| 503 на сайте | Неверный `DATABASE_URL` или не сделан `db:push` |
| Парсер не крутится | `systemctl status tradehub-parser.timer` |

---

## 5. Домен и HTTPS

### 5.1 DNS (панель Beget → домены → DNS)

Для сайта **[barakali.online](http://barakali.online/)** (или любого домена на этом VPS):

| Тип | Имя / поддомен | Значение |
|-----|----------------|----------|
| **A** | `@` (корень) | IP вашего VPS (например `155.212.134.183`) |
| **A** | `www` | тот же IP **или** CNAME `www` → `barakali.online` |

Подождите 5–30 минут, пока DNS обновится: `dig +short barakali.online A` должен показать IP сервера.

### 5.2 Nginx под домен (на сервере)

Готовый конфиг в репозитории: `deploy/nginx/barakali.online.conf` — прокси на `127.0.0.1:3000`, редирект `www` → без `www`.

```bash
sudo cp /opt/tradehub/deploy/nginx/barakali.online.conf /etc/nginx/sites-available/barakali.online
sudo ln -sf /etc/nginx/sites-available/barakali.online /etc/nginx/sites-enabled/
# если раньше был только дефолтный tradehub.example.conf на все хосты — отключите конфликт:
# sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Проверка: `curl -sI http://barakali.online/` — должен быть ответ от приложения.

### 5.3 HTTPS (Let’s Encrypt)

После того как домен по A-записи смотрит на VPS:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d barakali.online -d www.barakali.online
```

Certbot сам допишет `listen 443 ssl` и пути к сертификатам. Автопродление обычно ставится в cron/systemd-timer.

**Важно:** cookie админки с `secure: true` работают только по HTTPS; на чистом HTTP сессия может вести себя иначе — для продакшена лучше включить HTTPS.
