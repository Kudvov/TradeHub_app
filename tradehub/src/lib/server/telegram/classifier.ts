/**
 * AI-классификатор объявлений: Google Gemini, при сбое — Ollama (локально).
 * Один запрос = фильтр спама + категория.
 */

import { resolveGeminiModel } from './gemini-model';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const OLLAMA_BASE = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_CLASSIFY_MODEL = (process.env.OLLAMA_CLASSIFY_MODEL ?? '').trim();

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

/** Первый токен ответа → нормализованный идентификатор (латиница, без подчёркиваний: NOT_LISTING → notlisting). */
function normalizeClassifyAnswer(raw: string): string {
	const line = (raw.trim().split('\n')[0] ?? '').trim();
	const first = line.split(/[\s,;:]+/)[0] ?? line;
	return first.toLowerCase().replace(/[^a-z]/g, '');
}

const PROMPT_TEMPLATE = `Ты — строгий AI-классификатор объявлений для онлайн-барахолки.

Твоя задача — определить ОДНУ наиболее подходящую категорию для сообщения.

Доступные категории:

* electronics — телефоны, ноутбуки, компьютеры, планшеты, бытовая техника, гаджеты, игровые приставки, аксессуары для техники
* clothing — одежда, обувь, сумки, украшения, часы, аксессуары
* auto — автомобили, мотоциклы, запчасти, аренда авто, автосервис
* furniture — мебель, предметы интерьера, бытовые товары для дома, посуда, освещение
* realestate — квартиры, дома, комнаты, коммерческие помещения, аренда или продажа недвижимости
* services — реальные услуги: ремонт, доставка, уборка, обучение, курсы, репетиторство, дизайн, разработка, перевозки
* kids — детские товары, игрушки, одежда для детей, коляски, кроватки, товары для младенцев
* sport — спортивный инвентарь, тренажёры, велосипеды, самокаты, ролики, товары для активного отдыха
* animals — домашние животные, птицы, рыбы, грызуны, товары для животных, корм, клетки, переноски, аксессуары
* other — всё, что не подходит ни под одну категорию выше: растения, продукты, книги, музыка, хобби, коллекционные товары и прочее
* NOT_LISTING — сообщение не является объявлением: общение, приветствие, флуд, реклама, спам, мошенничество, схемы заработка, казино, ставки, крипта, запрещённые товары

Правила классификации:

1. Выбирай только ОДНУ категорию.
2. Если продаётся, покупается, сдаётся, отдаётся или ищется товар / услуга — это объявление.
3. Если сообщение похоже на переписку, комментарий, обсуждение, вопрос, флуд или рекламу канала — выбирай NOT_LISTING.
4. Любые сообщения про лёгкий заработок, доход без опыта, быстрые деньги, работа с телефона, «пиши в лс», «доход от X$ в день», партнёрские схемы — ВСЕГДА NOT_LISTING.
5. Любые сообщения про крипто-сигналы, трейдинг-группы, пампы, инвестиции с гарантированной прибылью, финансовые пирамиды — ВСЕГДА NOT_LISTING.
6. Любые сообщения про казино, ставки, букмекеров, прогнозы, слоты, бонусы — ВСЕГДА NOT_LISTING.
7. Любые объявления, связанные с табачной и никотиновой продукцией, ВСЕГДА классифицируй как NOT_LISTING, включая:

   * сигареты
   * электронные сигареты
   * вейпы
   * поды / pod-системы
   * HQD / Elf Bar / Lost Mary и аналогичные устройства
   * жидкости для вейпа
   * картриджи
   * никотин / никотиновые смеси
   * сигары / табак / кальяны / стики
8. Любые объявления, связанные с алкоголем, ВСЕГДА классифицируй как NOT_LISTING, включая:

   * пиво
   * вино
   * шампанское
   * водка
   * виски
   * коньяк
   * чача
   * коктейли
   * любые алкогольные напитки
9. Сообщения с явными признаками мошенничества:

   * срочно переведи деньги
   * предоплата без товара
   * слишком выгодная цена
   * только сегодня
   * гарантированный доход
   * без риска
   * пиши в Telegram / WhatsApp
     → ВСЕГДА NOT_LISTING
10. Игнорируй эмодзи, ссылки, хештеги, капс, ошибки, повторяющиеся символы.
11. Если текст короткий, но явно похож на объявление — всё равно классифицируй.
12. Отвечай СТРОГО одним словом — только названием категории.

Текст сообщения:
"""
{TEXT}
"""

Ответ:`;

async function geminiClassify(text: string): Promise<string | null> {
	if (!GEMINI_API_KEY) return null;

	try {
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolveGeminiModel()}:generateContent?key=${GEMINI_API_KEY}`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: PROMPT_TEMPLATE.replace('{TEXT}', text) }] }],
				generationConfig: { temperature: 0, maxOutputTokens: 32 }
			}),
			signal: AbortSignal.timeout(15_000)
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
		};

		const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
		return normalizeClassifyAnswer(raw);
	} catch {
		return null;
	}
}

async function ollamaClassify(text: string): Promise<string | null> {
	if (!OLLAMA_CLASSIFY_MODEL) return null;

	try {
		const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: OLLAMA_CLASSIFY_MODEL,
				prompt: PROMPT_TEMPLATE.replace('{TEXT}', text),
				stream: false,
				options: { temperature: 0, num_predict: 32 }
			}),
			signal: AbortSignal.timeout(60_000)
		});

		if (!response.ok) return null;

		const data = (await response.json()) as { response?: string };
		return normalizeClassifyAnswer(data.response ?? '');
	} catch {
		return null;
	}
}

function isRejectToken(answer: string): boolean {
	return answer === 'notlisting' || answer === 'reject';
}

export async function classifyListing(text: string): Promise<ClassifyResult> {
	const snippet = text.slice(0, 2000);
	let answer = await geminiClassify(snippet);
	if (answer === null || answer === '') {
		answer = await ollamaClassify(snippet);
	}

	if (answer === null || answer === '') {
		return { isListing: true, categorySlug: 'other' };
	}

	if (isRejectToken(answer)) {
		return { isListing: false };
	}

	const slug = CATEGORY_SLUGS.find((s) => s === answer);
	return { isListing: true, categorySlug: slug ?? 'other' };
}
