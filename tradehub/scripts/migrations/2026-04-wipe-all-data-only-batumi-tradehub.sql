-- Полная очистка данных: объявления, жалобы, баны авторов; все группы кроме @BatumiTradeHub.
-- Справочники cities и categories не трогаем. Счётчики объявлений по городам обнуляем.
--
-- Выполнить на сервере:
--   cd /opt/teleposter && export $(grep -v '^#' .env | xargs) && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrations/2026-04-wipe-all-data-only-batumi-tradehub.sql
--
BEGIN;

-- Объявления и связанные жалобы (listing_reports ссылается на listings)
TRUNCATE TABLE listings RESTART IDENTITY CASCADE;

TRUNCATE TABLE banned_authors RESTART IDENTITY;

DELETE FROM telegram_groups WHERE lower(coalesce(username, '')) <> 'batumitradehub';

UPDATE telegram_groups
SET
	title = 'Batumi Trade Hub',
	is_active = true,
	last_message_id = 1,
	start_message_id = 0,
	last_parsed_at = NULL,
	telegram_id = NULL
WHERE lower(coalesce(username, '')) = 'batumitradehub';

INSERT INTO telegram_groups (title, username, city_id, is_active, last_message_id, start_message_id)
SELECT 'Batumi Trade Hub', 'BatumiTradeHub', c.id, true, 1, 0
FROM cities c
WHERE c.slug = 'batumi'
	AND NOT EXISTS (SELECT 1 FROM telegram_groups g WHERE lower(coalesce(g.username, '')) = 'batumitradehub');

-- Одна строка на @BatumiTradeHub (если в БД уже были дубликаты)
DELETE FROM telegram_groups tg
WHERE lower(coalesce(tg.username, '')) = 'batumitradehub'
	AND tg.id > (
		SELECT MIN(id) FROM telegram_groups g WHERE lower(coalesce(g.username, '')) = 'batumitradehub'
	);

UPDATE cities SET listings_count = 0;

COMMIT;
