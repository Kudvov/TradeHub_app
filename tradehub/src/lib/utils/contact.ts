const PHONE_PATTERN = /^[\+\d][\d\s\-\(\)]{6,}$/;
const TG_USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,}$/;

/** Ссылки из embed-виджета часто приходят как //t.me/user */
function absolutizeTelegramHref(value: string): string {
	const v = value.trim();
	if (v.startsWith('//') && /\/\/(t\.me|telegram\.me)(\/|$)/i.test(v)) {
		return `https:${v}`;
	}
	return v;
}

function upgradeHttpTelegramToHttps(value: string): string {
	if (/^http:\/\/(t\.me|telegram\.me)\//i.test(value)) {
		return `https://${value.slice('http://'.length)}`;
	}
	return value;
}

/** Подходит ли ссылка для кнопки «написать в Telegram» (личка по @username) */
export function isTelegramProfileHref(href: string): boolean {
	if (!href || href === '#') return false;
	const h = absolutizeTelegramHref(upgradeHttpTelegramToHttps(href));
	if (isPhoneContact(href)) return false;
	try {
		const u = new URL(h);
		const host = u.hostname.replace(/^www\./i, '').toLowerCase();
		if (host !== 't.me' && host !== 'telegram.me') return false;
		const first = u.pathname.replace(/^\//, '').split('/')[0];
		if (!first || first === 'c' || first === 's' || first.startsWith('+')) return false;
		return TG_USERNAME_PATTERN.test(first);
	} catch {
		return /^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}(?:\/?|$)/i.test(h);
	}
}

function normalizeTelegramUsername(contact: string): string | null {
	const value = contact.trim();
	const withoutPrefix = value
		.replace(/^https?:\/\/t\.me\//i, '')
		.replace(/^t\.me\//i, '')
		.replace(/^@/, '');

	return TG_USERNAME_PATTERN.test(withoutPrefix) ? withoutPrefix : null;
}

export function isPhoneContact(contact: string): boolean {
	return PHONE_PATTERN.test(contact.trim());
}

export function getContactHref(contact: string): string {
	let c = absolutizeTelegramHref(contact.trim());
	if (!c) return '#';

	if (isPhoneContact(c)) {
		return `tel:${c.replace(/\s/g, '')}`;
	}

	if (/^https?:\/\//i.test(c)) {
		return upgradeHttpTelegramToHttps(c);
	}

	if (c.startsWith('t.me/')) {
		const username = normalizeTelegramUsername(c);
		return username ? `https://t.me/${username}` : '#';
	}

	if (c.startsWith('@')) {
		const username = normalizeTelegramUsername(c);
		return username ? `https://t.me/${username}` : '#';
	}

	const username = normalizeTelegramUsername(c);
	return username ? `https://t.me/${username}` : '#';
}
