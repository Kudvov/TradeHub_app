/** Премиум-группы Telegram по городу: светло-жёлтая обводка карточки и приоритет в ленте. */
export const PREMIUM_TELEGRAM_BY_CITY_SLUG = {
	batumi: { username: 'BatumiTradeHub', url: 'https://t.me/BatumiTradeHub' },
	tbilisi: { username: 'TbilisiTradeHub', url: 'https://t.me/TbilisiTradeHub' }
} as const;

export type PremiumCitySlug = keyof typeof PREMIUM_TELEGRAM_BY_CITY_SLUG;

/** Совместимость: прежние импорты под Батуми. */
export const PREMIUM_TELEGRAM_GROUP_USERNAME = PREMIUM_TELEGRAM_BY_CITY_SLUG.batumi.username;
export const PREMIUM_TELEGRAM_GROUP_URL = PREMIUM_TELEGRAM_BY_CITY_SLUG.batumi.url;

export function premiumConfigForCitySlug(slug: string | null | undefined) {
	if (!slug) return null;
	return PREMIUM_TELEGRAM_BY_CITY_SLUG[slug as PremiumCitySlug] ?? null;
}

/** Username премиум-группы для ленты города (сортировка SQL). */
export function premiumTelegramUsernameForCityPage(slug: string): string | null {
	return premiumConfigForCitySlug(slug)?.username ?? null;
}

export function normalizeTgUsername(raw: string | null | undefined): string {
	return (raw ?? '').replace(/^@/, '').trim().toLowerCase();
}

export function isPremiumListing(listing: {
	telegramGroup?: { username?: string | null } | null;
	city?: { slug?: string | null } | null;
}): boolean {
	const cfg = premiumConfigForCitySlug(listing.city?.slug ?? undefined);
	if (!cfg) return false;
	return normalizeTgUsername(listing.telegramGroup?.username) === cfg.username.toLowerCase();
}

/** Любая из премиум-групп (админка, отладка). */
export function isPremiumGroupUsername(username: string | null | undefined): boolean {
	const n = normalizeTgUsername(username);
	if (!n) return false;
	return (Object.values(PREMIUM_TELEGRAM_BY_CITY_SLUG) as { username: string }[]).some(
		(p) => p.username.toLowerCase() === n
	);
}
