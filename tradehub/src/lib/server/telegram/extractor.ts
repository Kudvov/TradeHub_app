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

export function extractData(
	text: string,
	username: string | undefined,
	groupUsername?: string
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
		/(?:(?:gel|lari|лари|лар(?:ов|и|ей)?\b|₾|usd|\$|rub|руб|₽)\s*(\d+)|(\d+)\s*(?:gel|lari|лари|лар(?:ов|и|ей)?\b|₾|usd|\$|rub|руб|₽))/i
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

	// 3. Категоризация по ключевым словам
	const tL = text.toLowerCase();
	let categoryId = null;

	// Мебель и бытовая техника
	if (tL.match(/кровать|матрас|диван|шкаф|комод|тумбочк|вешалк|икеа|ikea|мебель|холодильник|стиральн|посудомо|пылесос|микроволновк|духовк|чайник|кастрюл|сковород|посуд[аы]/)) {
		categoryId = 4;
	// Электроника (не «телефон» как контакт, а конкретные устройства)
	} else if (tL.match(/iphone|macbook|ipad|airpods|apple watch|samsung|xiaomi(?! самокат| electric)|huawei|смартфон|ноутбук|планшет|телевизор|монитор|видеокарт|процессор|playstation|ps[2345]\b|xbox|приставк|наушник|микрофон|bluetooth.*колонк|колонк.*jbl|jbl\b|gopro|фотоаппарат|объектив|роутер|принтер|powerbank|power bank|повербанк/)) {
		categoryId = 1;
	// Авто (конкретные марки и автотермины, не широкое «авто»)
	} else if (tL.match(/toyota|bmw|mercedes|honda|hyundai|kia\b|ford\b|renault|volkswagen|audi\b|mitsubishi|nissan|mazda|lada|автомобил|продам авто|куплю авто|резина\b|шины\b|колёса\b|колеса\b|автозапчаст|запчаст|бампер|двигател|кузов|капот/)) {
		categoryId = 3;
	// Недвижимость
	} else if (tL.match(/квартир|студию|студия|однушк|двушк|трёшк|апартамент|сдаю\b|сдам\b|сдаётся|снять\b|снимаю|посуточно|аренда\b|арендую|комнату\b/)) {
		categoryId = 5;
	// Детские товары
	} else if (tL.match(/коляск|детск[аяий]\b|детского|детские\b|ребёнку|ребенку|малыш|новорождён|новорожден|игрушк|памперс|подгузник/)) {
		categoryId = 7;
	// Спорт
	} else if (tL.match(/велосипед|самокат|электросамокат|сапборд|сноуборд|лыж[иа]\b|скейт|ролик[иов]\b|тренажер|гантел|штанг[аи]\b|гири\b|беговая дорожка|боксёрск|боксерск|спортивн.*инвентар/)) {
		categoryId = 8;
	// Одежда и обувь
	} else if (tL.match(/одежда|обувь|куртк|пальто|пиджак|пуховик|дублёнк|плащ\b|платье|юбк|джинс|брюки|штаны|шорты|блузк|рубашк|свитер|толстовк|худи\b|футболк|комбинезон|кроссовк|кед[ыа]\b|ботинк|туфл|сапог[иа]|сандал|шлёпк|шлепк|балетк|мокасин|шапк|шарф\b|перчатк|носки\b|сумка\b|рюкзак|жилет/)) {
		categoryId = 2;
	// Услуги (последним, чтобы продажа товаров шла выше)
	} else if (tL.match(/мастер на час|сантехни|(?<!\w)электрика\b|(?<!\w)электрики\b|монтаж|установка\b|уборка\b|клининг|репетитор|обучение\b|курсы\b|курс[ыа] |грузчик|парикмахер|маникюр|педикюр|стрижка\b|фотосессия|изготовлени|вскрытие|слесарн|доставка\b|перевозк/)) {
		categoryId = 6;
	}

	return {
		title,
		description,
		price,
		currency,
		contact,
		categoryId
	};
}
