-- Таблица для бана авторов по контакту (админка «Бан автора», проверка в parser:sync).
-- Если её нет, Drizzle падает с Failed query … banned_authors на каждом сообщении с контактом.
CREATE TABLE IF NOT EXISTS banned_authors (
	id serial PRIMARY KEY,
	contact text NOT NULL,
	reason text,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT banned_authors_contact_key UNIQUE (contact)
);

ALTER TABLE banned_authors ADD COLUMN IF NOT EXISTS reason text;
