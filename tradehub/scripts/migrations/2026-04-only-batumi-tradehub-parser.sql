-- Оставить в парсере только @BatumiTradeHub, курсор «с нуля»: last_message_id=1, start_message_id=0
-- (первый прогон: авто-верхний ID + история вниз по sync.ts).
--
-- Выполнить на сервере:
--   cd /opt/teleposter && export $(grep -v '^#' .env | xargs) && psql "$DATABASE_URL" -f scripts/migrations/2026-04-only-batumi-tradehub-parser.sql
--
BEGIN;

UPDATE listings
SET telegram_group_id = NULL
WHERE telegram_group_id IN (
	SELECT id FROM telegram_groups WHERE lower(coalesce(username, '')) <> 'batumitradehub'
);

DELETE FROM telegram_groups WHERE lower(coalesce(username, '')) <> 'batumitradehub';

UPDATE telegram_groups
SET
	title = 'Batumi Trade Hub',
	is_active = true,
	last_message_id = 1,
	start_message_id = 0,
	last_parsed_at = NULL
WHERE lower(coalesce(username, '')) = 'batumitradehub';

INSERT INTO telegram_groups (title, username, city_id, is_active, last_message_id, start_message_id)
SELECT 'Batumi Trade Hub', 'BatumiTradeHub', c.id, true, 1, 0
FROM cities c
WHERE c.slug = 'batumi'
	AND NOT EXISTS (SELECT 1 FROM telegram_groups g WHERE lower(coalesce(g.username, '')) = 'batumitradehub');

COMMIT;
