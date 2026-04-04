import type { Cookies } from '@sveltejs/kit';

export const PREFERRED_CITY_COOKIE = 'teleposter_city';

const ALLOWED_SLUGS = new Set(['batumi', 'tbilisi']);

export function parsePreferredCitySlug(raw: string | undefined): string | null {
	if (!raw) return null;
	const s = raw.trim().toLowerCase();
	return ALLOWED_SLUGS.has(s) ? s : null;
}

/** Запомнить выбранный город (1 год, httpOnly, SameSite=Lax). */
export function setPreferredCityCookie(cookies: Cookies, citySlug: string, url: URL): void {
	if (!ALLOWED_SLUGS.has(citySlug)) return;
	cookies.set(PREFERRED_CITY_COOKIE, citySlug, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:'
	});
}
