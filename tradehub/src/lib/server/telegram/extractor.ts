export interface ExtractedData {
	title: string;
	description: string;
	price: string | null;
	currency: 'GEL' | 'USD' | 'RUB' | null;
	contact: string | null;
	categoryId: number | null;
}

export function extractData(text: string, username: string | undefined): ExtractedData {
	if (!text) {
		return {
			title: 'Без названия',
			description: '',
			price: null,
			currency: null,
			contact: username ? `@${username}` : null,
			categoryId: null
		};
	}

	const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
	const title = lines.length > 0 ? lines[0].substring(0, 100) : 'Без названия';
	const description = text;

	// 1. Извлечение цены и валюты
	// Ищем паттерны: "1000 gel", "Gel 100", "50lari", "100$", "usd 50", "2000 лари"
	let price = null;
	let currency: ExtractedData['currency'] = null;

	const priceMatch = text.match(/(?:(?:gel|lari|лари|₾|usd|\$|rub|руб|₽)\s*(\d+)|(\d+)\s*(?:gel|lari|лари|₾|usd|\$|rub|руб|₽))/i);
	if (priceMatch) {
		price = (priceMatch[1] || priceMatch[2]).trim();
		const matchStr = priceMatch[0].toLowerCase();
		
		if (matchStr.includes('usd') || matchStr.includes('$')) {
			currency = 'USD';
		} else if (matchStr.includes('rub') || matchStr.includes('руб') || matchStr.includes('₽')) {
			currency = 'RUB';
		} else {
			currency = 'GEL'; // default for local markets
		}
	}

	// 2. Извлечение контактов
	// Ищем @username, t.me/username, или номера телефонов +995...
	let contact = null;
	
	const phoneMatch = text.match(/(?:\+995)?\s*\(?\d{3}\)?\s*\d{2}\s*\d{2}\s*\d{2}/);
	const usernameMatch = text.match(/@([a-zA-Z0-9_]+)/);
	const tmeMatch = text.match(/t\.me\/([a-zA-Z0-9_]+)/);

	// Валидный Telegram username: только латиница, цифры, подчёркивание, 5+ символов
	const isValidTgUsername = (u: string) => /^[a-zA-Z0-9_]{5,}$/.test(u);

	if (phoneMatch) {
		contact = phoneMatch[0].replace(/\s/g, '');
	} else if (tmeMatch) {
		contact = `@${tmeMatch[1]}`;
	} else if (usernameMatch) {
		contact = usernameMatch[0];
	} else if (username && isValidTgUsername(username)) {
		// Используем только если это валидный @username (не название канала с кириллицей)
		contact = `@${username}`;
	}

	// 3. Базовая категоризация
	const tL = text.toLowerCase();
	let categoryId = null; // Будет матчиться с ID из БД (пока хардкод)

	if (tL.match(/кровать|стол|стул|диван|шкаф|ikea|мебель/)) {
		categoryId = 4; // Мебель
	} else if (tL.match(/iphone|macbook|телефон|apple|samsung|ноутбук|пк/)) {
		categoryId = 1; // Электроника
	} else if (tL.match(/авто|машина|toyota|bmw|mercedes|honda|резина|шины/)) {
		categoryId = 3; // Авто
	} else if (tL.match(/квартира|аренда|сдам|сниму|комната|хата/)) {
		categoryId = 5; // Недвижимость
	} else if (tL.match(/коляска|детская|игрушки|памперсы/)) {
		categoryId = 7; // Детские товары
	} else if (tL.match(/велосипед|самокат|спорт|гантели/)) {
		categoryId = 8; // Спорт
	} else if (tL.match(/одежда|обувь|куртка|платье|джинсы|кроссовки|кеды|шлепки|сапоги/)) {
		categoryId = 2; // Одежда
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
