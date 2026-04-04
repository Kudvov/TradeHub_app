-- Добавляем колонки для переводов объявлений (EN + KA)
ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS title_en       text,
    ADD COLUMN IF NOT EXISTS description_en text,
    ADD COLUMN IF NOT EXISTS title_ka       text,
    ADD COLUMN IF NOT EXISTS description_ka text;
