-- @Batumi_helps (Батуми), парсинг с сообщения 2301897 и новее.
-- Выполнить: psql "$DATABASE_URL" -f scripts/migrations/2026-04-batumi-helps-group.sql

INSERT INTO telegram_groups (title, username, city_id, is_active, last_message_id, start_message_id)
SELECT 'Batumi helps', 'Batumi_helps', id, true, 2301897, 2301897
FROM cities
WHERE slug = 'batumi'
	AND NOT EXISTS (
		SELECT 1 FROM telegram_groups g WHERE lower(coalesce(g.username, '')) = 'batumi_helps'
	);

UPDATE telegram_groups
SET last_message_id = 2301897,
	start_message_id = 2301897,
	is_active = true
WHERE lower(coalesce(username, '')) = 'batumi_helps';
