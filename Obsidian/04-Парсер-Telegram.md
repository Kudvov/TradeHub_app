# Парсер Telegram

## Команда

```bash
cd /opt/teleposter   # или tradehub локально
npm run parser:sync
```

Скрипт: `src/lib/server/telegram/sync.ts`.

## Логика

- Читает активные группы из таблицы **`telegram_groups`** (`is_active = true`).
- Для каждой группы: нормализует `@username`, движется по `message_id` **вверх** (новые посты) или **вниз** (первичная история), см. код.
- Запросы к страницам embed: **`scraper.ts`**, задержки **`SYNC_MESSAGE_GAP_MS`** и др. (см. [[07-Переменные-окружения]]).
- После прохода по группам: обновление счётчиков городов, опционально **`refreshRecentListingImages`** (если не отключено `REFRESH_IMAGES_AFTER_SYNC=0`).

## Логи на сервере

```bash
journalctl -u teleposter-parser.service -e
```

В админке вкладка «Логи» дергает API, который собирает вывод **`journalctl`** за ограниченное окно (сервис + таймер).

## Ограничения

- Слишком частые запросы к `t.me` могут дать **429** — увеличить паузы в env.
- Долгий прогон + рефреш фото не должен упираться в лимит systemd — см. [[03-Деплой-VPS]].

← [[Teleposter]]
