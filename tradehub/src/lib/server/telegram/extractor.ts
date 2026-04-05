export interface ExtractedData {
	title: string;
	description: string;
	price: string | null;
	currency: 'GEL' | 'USD' | 'RUB' | null;
	contact: string | null;
	categoryId: number | null;
}

const RESERVED_TG_PATHS = new Set([
	'joinchat',
	'addstickers',
	'share',
	'proxy',
	'iv',
	'socks',
	'telegramtips',
	'settings',
	'login'
]);

/** Модель для извлечения полей объявления (Google AI / Gemini API). */
const GEMINI_EXTRACT_MODEL = 'gemini-2.0-flash';
const GEMINI_EXTRACT_TIMEOUT_MS = 20_000;

function normalizeGroupHandle(handle: string | undefined): string {
	if (!handle) return '';
	return handle
		.trim()
		.replace(/^https?:\/\/t\.me\//i, '')
		.replace(/^@/, '')
		.replace(/\/$/, '')
		.toLowerCase();
}

export function isValidTelegramPublicUsername(u: string): boolean {
	return /^[a-zA-Z0-9_]{5,32}$/.test(u);
}

function toTgLink(u: string): string {
	return `t.me/${u}`;
}

/** Все публичные username из текста (t.me / @ / telegram.me), без дубликатов по порядку */
function collectUsernamesFromText(text: string, groupHandle?: string): string[] {
	const group = normalizeGroupHandle(groupHandle);
	const out: string[] = [];
	const seen = new Set<string>();

	const push = (u: string) => {
		const lower = u.toLowerCase();
		if (!isValidTelegramPublicUsername(u)) return;
		if (lower === group) return;
		if (RESERVED_TG_PATHS.has(lower)) return;
		if (seen.has(lower)) return;
		seen.add(lower);
		out.push(u);
	};

	for (const m of text.matchAll(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{5,32})(?:[/?#]|\b)/gi)) {
		push(m[1]);
	}
	for (const m of text.matchAll(/@([a-zA-Z0-9_]{5,32})\b/g)) {
		push(m[1]);
	}

	return out;
}

// Соответствует порядку вставки в seed.ts + миграции
const SLUG_TO_CATEGORY_ID: Record<string, number> = {
	electronics: 1,
	clothing: 2,
	auto: 3,
	furniture: 4,
	realestate: 5,
	services: 6,
	kids: 7,
	sport: 8,
	other: 9,
	animals: 37
};

interface GeminiExtractJson {
	title?: string;
	price?: string | null;
	currency?: string | null;
	contact?: string | null;
}

function normalizeCurrency(raw: unknown): ExtractedData['currency'] {
	if (raw === 'GEL' || raw === 'USD' || raw === 'RUB') return raw;
	return null;
}

function normalizePrice(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null;
	const s = String(raw).trim();
	if (!s) return null;
	if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
	return s;
}

/** Нормализует contact из ответа модели (username / t.me / телефон). */
function normalizeRawContact(raw: string | null | undefined, groupUsername?: string): string | null {
	if (raw == null || typeof raw !== 'string') return null;
	let c = raw.trim();
	if (!c) return null;
	const groupNorm = normalizeGroupHandle(groupUsername);

	const tm = c.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{5,32})(?:\b|[/?#])/i);
	if (tm) {
		const u = tm[1];
		if (u.toLowerCase() !== groupNorm && isValidTelegramPublicUsername(u)) return toTgLink(u);
		return null;
	}

	c = c.replace(/^@/, '');
	if (isValidTelegramPublicUsername(c) && c.toLowerCase() !== groupNorm) return toTgLink(c);

	const compact = c.replace(/\s/g, '');
	if (/^\+?995\d{9}$/.test(compact) || /^\+?\d{10,15}$/.test(compact)) return compact.startsWith('+') ? compact : `+${compact}`;

	return null;
}

function resolveContact(
	text: string,
	username: string | undefined,
	groupUsername: string | undefined,
	geminiContact: string | null
): string | null {
	const groupNorm = normalizeGroupHandle(groupUsername);
	if (username && isValidTelegramPublicUsername(username) && username.toLowerCase() !== groupNorm) {
		return toTgLink(username);
	}

	const fromGemini = normalizeRawContact(geminiContact ?? null, groupUsername);
	if (fromGemini) return fromGemini;

	const fromText = collectUsernamesFromText(text, groupUsername);
	if (fromText.length > 0) return toTgLink(fromText[0]);

	const phoneMatch =
		text.match(/(?:\+995)?\s*\(?\d{3}\)?\s*\d{2}\s*\d{2}\s*\d{2}/) ||
		text.match(/\b5\d{2}\s*\d{3}\s*\d{3}\b/) ||
		text.match(/\b59\d{7}\b/);
	if (phoneMatch) return phoneMatch[0].replace(/\s/g, '');

	return null;
}

function parseJsonObject(raw: string): GeminiExtractJson | null {
	const trimmed = raw.trim();
	const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return null;
	try {
		return JSON.parse(jsonMatch[0]) as GeminiExtractJson;
	} catch {
		return null;
	}
}

async function extractWithGemini(
	text: string,
	authorUsername: string | undefined,
	groupUsername: string | undefined,
	apiKey: string
): Promise<Omit<ExtractedData, 'categoryId' | 'description'> | null> {
	const groupNorm = normalizeGroupHandle(groupUsername);
	const author = (authorUsername ?? '').trim();
	const adSnippet = JSON.stringify(text.slice(0, 8000));

	const prompt = `You extract structured fields from a classified ad (Telegram channel post). Text may be Russian, Georgian, or English.

Return ONLY a JSON object with keys:
- title: short headline, max 100 characters, plain text, no markdown
- price: string of digits with optional decimal part (e.g. "25" or "99.50"), or null if no price
- currency: one of "GEL", "USD", "RUB", or null
- contact: Telegram public username (5-32 chars, [a-zA-Z0-9_]) without @, OR a phone starting with +995, OR null. Never use group_to_ignore as contact.

Context:
- author_username (message author, prefer as contact if valid and different from group): ${JSON.stringify(author)}
- group_to_ignore (channel username, not the seller): ${JSON.stringify(groupNorm)}

Ad text (JSON-encoded string, parse it):
${adSnippet}`;

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EXTRACT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), GEMINI_EXTRACT_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			signal: controller.signal,
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.15,
					maxOutputTokens: 512,
					responseMimeType: 'application/json'
				}
			})
		});

		if (!res.ok) return null;

		const data = (await res.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[];
		};
		const part = data.candidates?.[0]?.content?.parts?.[0];
		const t = part?.text?.trim();
		if (!t) return null;

		const parsed = parseJsonObject(t);
		if (!parsed) return null;

		const titleRaw = typeof parsed.title === 'string' ? parsed.title.trim() : '';
		const title =
			titleRaw.length > 0 ? titleRaw.slice(0, 100) : (text.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? 'Без названия').slice(0, 100);

		return {
			title: title || 'Без названия',
			price: normalizePrice(parsed.price),
			currency: normalizeCurrency(parsed.currency),
			contact: typeof parsed.contact === 'string' ? parsed.contact.trim() || null : null
		};
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/** Извлечение без LLM (fallback при отсутствии ключа или ошибке API). */
export function extractDataRegex(
	text: string,
	username: string | undefined,
	groupUsername?: string,
	categorySlug?: string
): ExtractedData {
	const groupNorm = normalizeGroupHandle(groupUsername);

	if (!text) {
		return {
			title: 'Без названия',
			description: '',
			price: null,
			currency: null,
			contact:
				username && isValidTelegramPublicUsername(username) && username.toLowerCase() !== groupNorm
					? toTgLink(username)
					: null,
			categoryId: categorySlug ? (SLUG_TO_CATEGORY_ID[categorySlug] ?? null) : null
		};
	}

	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	const title = lines.length > 0 ? lines[0].substring(0, 100) : 'Без названия';
	const description = text;

	let price = null;
	let currency: ExtractedData['currency'] = null;

	const priceMatch = text.match(
		/(?:(?:gel|lari|лари|лар(?:ов|и|ей)?|₾|usd|\$|rub|руб|₽)\s*(\d+)|(\d+)\s*(?:gel|lari|лари|лар(?:ов|и|ей)?|₾|usd|\$|rub|руб|₽))/i
	);
	if (priceMatch) {
		price = (priceMatch[1] || priceMatch[2]).trim();
		const matchStr = priceMatch[0].toLowerCase();

		if (matchStr.includes('usd') || matchStr.includes('$')) {
			currency = 'USD';
		} else if (matchStr.includes('rub') || matchStr.includes('руб') || matchStr.includes('₽')) {
			currency = 'RUB';
		} else {
			currency = 'GEL';
		}
	}

	const contact = resolveContact(text, username, groupUsername, null);
	const categoryId = categorySlug ? (SLUG_TO_CATEGORY_ID[categorySlug] ?? null) : null;

	return {
		title,
		description,
		price,
		currency,
		contact,
		categoryId
	};
}

/**
 * Извлечение полей объявления. При наличии GEMINI_API_KEY — Gemini Flash (JSON), иначе regex-fallback.
 * categoryId всегда из categorySlug (классификатор), не из модели.
 */
export async function extractData(
	text: string,
	username: string | undefined,
	groupUsername?: string,
	categorySlug?: string
): Promise<ExtractedData> {
	const key = process.env.GEMINI_API_KEY?.trim();
	if (!key) {
		return extractDataRegex(text, username, groupUsername, categorySlug);
	}

	const partial = await extractWithGemini(text, username, groupUsername, key);
	if (!partial) {
		return extractDataRegex(text, username, groupUsername, categorySlug);
	}

	const categoryId = categorySlug ? (SLUG_TO_CATEGORY_ID[categorySlug] ?? null) : null;
	const description = text;
	const contact = resolveContact(text, username, groupUsername, partial.contact);

	return {
		title: partial.title,
		description,
		price: partial.price,
		currency: partial.currency,
		contact,
		categoryId
	};
}
