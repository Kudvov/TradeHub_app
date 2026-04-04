/**
 * AI-классификатор объявлений через локальный Ollama (qwen2.5:3b).
 * Работает в два шага:
 *   1. Фильтр (ALLOW / REJECT)
 *   2. Категоризация (только если ALLOW)
 */

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:3b';

// Слаги должны совпадать с категориями в БД (seed.ts + миграции)
const CATEGORY_SLUGS = [
	'electronics',
	'clothing',
	'auto',
	'furniture',
	'realestate',
	'services',
	'kids',
	'sport',
	'animals',
	'other'
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type ClassifyResult =
	| { isListing: true; categorySlug: CategorySlug }
	| { isListing: false };

const FILTER_PROMPT = `Ты — строгий модератор объявлений для онлайн-барахолки.

Проверь, можно ли допустить сообщение к публикации.

Ответь строго одним словом:

* ALLOW — если это обычное объявление о продаже, покупке, аренде или услуге
* REJECT — если это не объявление, спам, запрещённый товар или мошенничество

Отклоняй (REJECT), если сообщение относится хотя бы к одному из пунктов:

* общение, приветствие, флуд, обсуждение
* реклама канала, группы, ссылки без товара
* лёгкий заработок, работа без опыта, быстрый доход
* крипта, сигналы, инвестиции, пирамиды
* казино, ставки, букмекеры
* сигареты, вейпы, поды, жидкости, никотин
* алкоголь: пиво, вино, водка, виски, Jack Daniels, Jameson, коньяк, шампанское, чача, самогон, ром, джин, текила
* подозрительные схемы: предоплата, гарантированный доход, срочно в личку

Текст:
"""
{TEXT}
"""

Ответ:`;

const CLASSIFY_PROMPT = `Ты — классификатор объявлений для барахолки.

Выбери ОДНУ категорию.

Категории:

* electronics
* clothing
* auto
* furniture
* realestate
* services
* kids
* sport
* animals
* other

Правила:

* телефоны, ноутбуки, техника → electronics
* одежда, обувь → clothing
* машины, мото, запчасти → auto
* мебель, интерьер → furniture
* квартиры, дома, аренда → realestate
* любые реальные услуги → services
* детские товары → kids
* спорттовары → sport
* животные и товары для них → animals
* всё остальное → other

Текст:
"""
{TEXT}
"""

Ответь строго одним словом — только названием категории.`;

async function ollamaGenerate(prompt: string): Promise<string | null> {
	try {
		const response = await fetch(OLLAMA_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model: MODEL, prompt, stream: false }),
			signal: AbortSignal.timeout(30_000)
		});
		if (!response.ok) return null;
		const data = (await response.json()) as { response: string };
		return data.response.trim();
	} catch {
		return null;
	}
}

export async function classifyListing(text: string): Promise<ClassifyResult> {
	const snippet = text.slice(0, 800);

	// Шаг 1: фильтр
	const filterRaw = await ollamaGenerate(FILTER_PROMPT.replace('{TEXT}', snippet));

	if (filterRaw === null) {
		// Ollama недоступна — не блокируем парсер
		return { isListing: true, categorySlug: 'other' };
	}

	const filterAnswer = filterRaw.toLowerCase().replace(/[^a-z]/g, '');
	if (filterAnswer !== 'allow') {
		return { isListing: false };
	}

	// Шаг 2: категория
	const classifyRaw = await ollamaGenerate(CLASSIFY_PROMPT.replace('{TEXT}', snippet));

	if (classifyRaw === null) {
		return { isListing: true, categorySlug: 'other' };
	}

	const slug = CATEGORY_SLUGS.find((s) => s === classifyRaw.toLowerCase().replace(/[^a-z]/g, ''));
	return { isListing: true, categorySlug: slug ?? 'other' };
}
