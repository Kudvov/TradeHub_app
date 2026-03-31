const PHONE_PATTERN = /^[\+\d][\d\s\-\(\)]{6,}$/;
const TG_USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,}$/;

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
	const c = contact.trim();
	if (!c) return '#';

	if (isPhoneContact(c)) {
		return `tel:${c.replace(/\s/g, '')}`;
	}

	if (/^https?:\/\//i.test(c)) {
		return c;
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
