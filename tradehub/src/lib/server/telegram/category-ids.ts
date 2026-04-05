/** Соответствует порядку вставки в seed.ts и миграциям (listings.category_id). */
export const CATEGORY_SLUG_TO_ID: Record<string, number> = {
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

export function categoryIdFromSlug(slug: string): number {
	return CATEGORY_SLUG_TO_ID[slug] ?? 9;
}
