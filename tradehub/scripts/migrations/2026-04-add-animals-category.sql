-- Добавление категории "Животные" для AI-классификатора
INSERT INTO categories (name, slug, icon, sort_order)
VALUES ('Животные', 'animals', '🐾', 9)
ON CONFLICT (slug) DO NOTHING;

-- Сдвигаем "Другое" в конец (sort_order=99 уже стоит, но на всякий случай)
UPDATE categories SET sort_order = 99 WHERE slug = 'other';
