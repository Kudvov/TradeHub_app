-- Если админка вставляет reason, а колонки не было в старой БД:
ALTER TABLE banned_authors ADD COLUMN IF NOT EXISTS reason text;
