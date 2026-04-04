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

export function extractData(
	text: string,
	username: string | undefined,
	groupUsername?: string,
	categorySlug?: string
): ExtractedData {
	const isValidTgUsername = isValidTelegramPublicUsername;
	const groupNorm = normalizeGroupHandle(groupUsername);

	if (!text) {
		return {
			title: 'Без названия',
			description: '',
			price: null,
			currency: null,
			contact:
				username && isValidTgUsername(username) && username.toLowerCase() !== groupNorm
					? toTgLink(username)
					: null,
			categoryId: null
		};
	}

	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	const title = lines.length > 0 ? lines[0].substring(0, 100) : 'Без названия';
	const description = text;

	// 1. Извлечение цены и валюты
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

	// 2. Контакты: автор из HTML → username из текста → телефон
	let contact = null;

	const fromText = collectUsernamesFromText(text, groupUsername);
	const phoneMatch =
		text.match(/(?:\+995)?\s*\(?\d{3}\)?\s*\d{2}\s*\d{2}\s*\d{2}/) ||
		text.match(/\b5\d{2}\s*\d{3}\s*\d{3}\b/) ||
		text.match(/\b59\d{7}\b/);

	if (username && isValidTgUsername(username) && username.toLowerCase() !== groupNorm) {
		contact = toTgLink(username);
	} else if (fromText.length > 0) {
		contact = toTgLink(fromText[0]);
	} else if (phoneMatch) {
		contact = phoneMatch[0].replace(/\s/g, '');
	}

	// 3. Категория — задаётся AI-классификатором через categorySlug
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
