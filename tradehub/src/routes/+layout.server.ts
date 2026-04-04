import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { parsePreferredCitySlug, PREFERRED_CITY_COOKIE } from '$lib/server/preferred-city-cookie';

export const load: LayoutServerLoad = async ({ cookies }) => {
	try {
		const { db } = await import('$lib/server/db');
		const { cities, listings } = await import('$lib/server/db/schema');
		const { listingHasPhotosSql } = await import('$lib/server/db/listing-photo-filter');
		const { asc, eq, and, gte, count, inArray } = await import('drizzle-orm');

		const allCities = await db
			.select()
			.from(cities)
			.where(inArray(cities.slug, ['batumi', 'tbilisi']))
			.orderBy(asc(cities.name));

		const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
		// «За 24ч» в шапке — по created_at (когда запись попала в БД), не по published_at.
		// Иначе при догоне очереди и дедупе кажется, что парсер «стоит»: дата в Telegram старая.
		// Число в шапке по городу = как на странице ленты: активные объявления с хотя бы одним фото.
		const [newCounts, activeCounts] = await Promise.all([
			db
				.select({ cityId: listings.cityId, cnt: count() })
				.from(listings)
				.where(
					and(eq(listings.status, 'active'), listingHasPhotosSql, gte(listings.createdAt, since24h))
				)
				.groupBy(listings.cityId),
			db
				.select({ cityId: listings.cityId, cnt: count() })
				.from(listings)
				.where(and(eq(listings.status, 'active'), listingHasPhotosSql))
				.groupBy(listings.cityId)
		]);

		const countMap = new Map(newCounts.map((r) => [r.cityId, Number(r.cnt)]));
		const activeMap = new Map(activeCounts.map((r) => [r.cityId, Number(r.cnt)]));
		const citiesWithCounts = allCities.map((c) => ({
			...c,
			newCount: countMap.get(c.id) ?? 0,
			// живое число активных объявлений для бейджа в шапке (не колонка cities.listings_count)
			listingsCount: activeMap.get(c.id) ?? 0
		}));

		const preferredCitySlug = parsePreferredCitySlug(cookies.get(PREFERRED_CITY_COOKIE));

		return { cities: citiesWithCounts, preferredCitySlug };
	} catch (e) {
		console.error('[layout] database unavailable', e);
		error(503, 'База данных недоступна. Проверьте DATABASE_URL на сервере.');
	}
};
