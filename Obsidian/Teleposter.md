# Teleposter — документация проекта

Сайт объявлений (Грузия: Батуми, Тбилиси и др.) с парсингом публичных постов из Telegram-групп через embed-страницы `t.me`.

**Исходный код:** папка `tradehub/` в этом репозитории.  
**Продакшен:** приложение в `/opt/teleposter` на VPS, Node + nginx, systemd.

Эта папка `Obsidian/` — сжатая документация для vault; развёрнутый гайд по VPS: **`tradehub/deploy/BEGET-VPS.md`**.

_Обновлено: 2026-04._

---

## Карта заметок

| Тема | Заметка |
|------|---------|
| Обзор и цели | [[01-Обзор-проекта]] |
| Стек, каталоги | [[02-Стек-и-структура]] |
| VPS, nginx, systemd | [[03-Деплой-VPS]] |
| `parser:sync`, journalctl | [[04-Парсер-Telegram]] |
| `/admin/groups` | [[05-Админка]] |
| Drizzle, таблицы | [[06-База-данных]] |
| `.env` | [[07-Переменные-окружения]] |

---

## Быстрые команды (локально)

```bash
cd tradehub
npm install
npm run db:up          # PostgreSQL из docker-compose
npm run db:push && npm run db:seed
npm run dev
```

Парсер вручную: `npm run parser:sync` (нужен `DATABASE_URL` и группы в БД).

---

## Ссылки на репозиторий

- Деплой: `tradehub/scripts/deploy-to-server.sh` · пример переменных: `tradehub/scripts/deploy-env.example`
- Полный чеклист VPS (DNS, HTTPS, типичные проблемы): `tradehub/deploy/BEGET-VPS.md`
- Unit-файлы: `tradehub/deploy/systemd/` (`teleposter.service`, `teleposter-parser.service`, `teleposter-parser.timer`)
- Nginx: `tradehub/deploy/nginx/` (`teleposter.example.conf`, `barakali.online.conf`)
