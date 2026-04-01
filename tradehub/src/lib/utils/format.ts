const currencySymbols: Record<string, string> = {
	GEL: '₾',
	USD: '$',
	EUR: '€',
	RUB: '₽'
};

export function formatPrice(price: string | null | undefined, currency: string = 'GEL'): string {
	if (!price) return 'Цена не указана';
	const num = parseFloat(price);
	if (isNaN(num)) return 'Цена не указана';

	const symbol = currencySymbols[currency] ?? currency;
	const formatted = num.toLocaleString('ru-RU', {
		minimumFractionDigits: 0,
		maximumFractionDigits: num % 1 === 0 ? 0 : 2
	});
	return `${formatted} ${symbol}`;
}

export function formatDate(date: Date | string | null): string {
	if (!date) return '';
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diff = now.getTime() - d.getTime();

	const minutes = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);

	if (minutes < 1) return 'только что';
	if (minutes < 60) return `${minutes} мин. назад`;
	if (hours < 24) return `${hours} ч. назад`;
	if (days < 7) return `${days} дн. назад`;

	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
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
