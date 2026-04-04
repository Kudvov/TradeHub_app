const currencySymbols: Record<string, string> = {
	GEL: '₾',
	USD: '$',
	EUR: '€',
	RUB: '₽'
};

const PRICE_NOT_SET: Record<string, string> = {
	ru: 'Цена не указана',
	en: 'Price not set',
	ka: 'ფასი არ არის'
};

export function formatPrice(
	price: string | null | undefined,
	currency: string = 'GEL',
	locale: string = 'ru'
): string {
	const fallback = PRICE_NOT_SET[locale] ?? PRICE_NOT_SET.ru;
	if (!price) return fallback;
	const num = parseFloat(price);
	if (isNaN(num)) return fallback;

	const symbol = currencySymbols[currency] ?? currency;
	const localeCode = locale === 'ka' ? 'ka-GE' : locale === 'en' ? 'en-US' : 'ru-RU';
	const formatted = num.toLocaleString(localeCode, {
		minimumFractionDigits: 0,
		maximumFractionDigits: num % 1 === 0 ? 0 : 2
	});
	return `${formatted} ${symbol}`;
}

const DATE_LABELS: Record<string, { justNow: string; min: string; hour: string; day: string }> = {
	ru: { justNow: 'только что', min: 'мин. назад', hour: 'ч. назад', day: 'дн. назад' },
	en: { justNow: 'just now', min: 'min. ago', hour: 'h. ago', day: 'd. ago' },
	ka: { justNow: 'ახლახან', min: 'წთ. წინ', hour: 'სთ. წინ', day: 'დ. წინ' }
};

export function formatDate(date: Date | string | null, locale: string = 'ru'): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diff = now.getTime() - d.getTime();

	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);

	const labels = DATE_LABELS[locale] ?? DATE_LABELS.ru;
	const localeCode = locale === 'ka' ? 'ka-GE' : locale === 'en' ? 'en-US' : 'ru-RU';

	if (minutes < 1) return labels.justNow;
	if (minutes < 60) return `${minutes} ${labels.min}`;
	if (hours < 24) return `${hours} ${labels.hour}`;
	if (days < 7) return `${days} ${labels.day}`;

	return d.toLocaleDateString(localeCode, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function truncate(text: string, maxLength: number = 120): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength).trimEnd() + '…';
}

export function maskLinks(text: string): string {
	if (!text) return text;
	return text
		.replace(/(?:https?:\/\/|www\.)\S+/gi, '[ссылка скрыта]')
		.replace(/\bt\.me\/\S+/gi, '[ссылка скрыта]');
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}
