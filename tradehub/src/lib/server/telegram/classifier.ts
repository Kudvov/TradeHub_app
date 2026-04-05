/**
 * AI-классификатор объявлений через Google Gemini 2.0 Flash.
 * Один запрос = фильтр спама + категория.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

function geminiModel(): string {
	const m = process.env.GEMINI_MODEL?.trim();
	if (m && /^[a-zA-Z0-9_.-]+$/.test(m)) return m;
	return 'gemini-2.5-flash';
}

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

const PROMPT_TEMPLATE = `Ты — модератор и классификатор объявлений для онлайн-барахолки в Грузии (Батуми, Тбилиси).

Проанализируй текст и ответь СТРОГО ОДНИМ СЛОВОМ (без точки, без пояснений).

Если это НЕ объявление о продаже/покупке/аренде/услуге — ответь: REJECT
Причины для REJECT: флуд, обсуждение, реклама канала без товара, крипта, казино, ставки, алкоголь, сигареты/вейпы, мошенничество, быстрый заработок, пирамиды.

Если это объявление — ответь ОДНИМ из слов:
electronics — телефоны, ноутбуки, планшеты, наушники, TV, фото/видео техника
clothing — одежда, обувь, аксессуары, сумки
auto — авто, мото, велосипеды, запчасти, шины
furniture — мебель, бытовая техника, холодильник, стиралка, посуда, интерьер
realestate — квартиры, дома, комнаты, аренда, посуточно
services — любые услуги (ремонт, репетитор, мастер, клининг, перевозка)
kids — детские товары, игрушки, коляски, одежда для детей
sport — спорттовары, тренажёры, самокаты, сноуборды, лыжи
animals — животные, корм, товары для питомцев
other — всё остальное (инструменты, книги, растения, антиквариат и т.п.)

Текст объявления:
"""
{TEXT}
"""

Ответ:`;

async function geminiClassify(text: string): Promise<string | null> {
	if (!GEMINI_API_KEY) return null;

	try {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${GEMINI_API_KEY}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: PROMPT_TEMPLATE.replace('{TEXT}', text) }] }],
				generationConfig: { temperature: 0, maxOutputTokens: 16 }
			}),
			signal: AbortSignal.timeout(15_000)
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
		};

		const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
		return raw.trim().toLowerCase().replace(/[^a-z]/g, '');
	} catch {
		return null;
	}
}

export async function classifyListing(text: string): Promise<ClassifyResult> {
	const snippet = text.slice(0, 600);
	const answer = await geminiClassify(snippet);

	if (answer === null) {
		// Gemini недоступен — не блокируем парсер, ставим other
		return { isListing: true, categorySlug: 'other' };
	}

	if (answer === 'reject') {
		return { isListing: false };
	}

	const slug = CATEGORY_SLUGS.find((s) => s === answer);
	return { isListing: true, categorySlug: slug ?? 'other' };
}
