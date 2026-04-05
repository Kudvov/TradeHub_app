import { typografUiString } from '$lib/i18n/typograf-messages';

/** Плитки на главной: подписи как на маркетплейсах; slug — из БД, иначе только поиск `q`. */
export type HomeCategoryTile = {
	label: string;
	emoji: string;
	categorySlug?: string;
	searchQuery?: string;
};

const HOME_CATEGORY_TILES_RAW: HomeCategoryTile[] = [
	{ label: 'Авто', emoji: '🚗', categorySlug: 'auto' },
	{ label: 'Недвижимость', emoji: '🏢', categorySlug: 'realestate' },
	{ label: 'Электроника', emoji: '📱', categorySlug: 'electronics' },
	{ label: 'Одежда, обувь, аксессуары', emoji: '👔', categorySlug: 'clothing' },
	{ label: 'Для дома и дачи', emoji: '🛋️', categorySlug: 'furniture' },
	{ label: 'Услуги', emoji: '🖌️', categorySlug: 'services' },
	{ label: 'Товары для детей', emoji: '👶', categorySlug: 'kids' },
	{ label: 'Хобби и спорт', emoji: '🛼', categorySlug: 'sport' },
	{ label: 'Животные', emoji: '🐾', categorySlug: 'animals' }
];

export const HOME_CATEGORY_TILES: HomeCategoryTile[] = HOME_CATEGORY_TILES_RAW.map((t) => ({
	...t,
	label: typografUiString('ru', t.label)
}));

export function homeCategoryTileHref(citySlug: string, tile: HomeCategoryTile): string {
	const params = new URLSearchParams();
	if (tile.categorySlug) params.set('category', tile.categorySlug);
	if (tile.searchQuery) params.set('q', tile.searchQuery);
	const qs = params.toString();
	return qs ? `/${citySlug}?${qs}` : `/${citySlug}`;
}
