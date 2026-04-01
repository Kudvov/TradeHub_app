import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	try {
		const { db } = await import('$lib/server/db');
		const { cities, listings } = await import('$lib/server/db/schema');
		const { asc, eq, and, gte, count, inArray } = await import('drizzle-orm');

		const allCities = await db
			.select()
			.from(cities)
			.where(inArray(cities.slug, ['batumi', 'tbilisi']))
			.orderBy(asc(cities.name));

		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const newCounts = await db
			.select({ cityId: listings.cityId, cnt: count() })
			.from(listings)
			.where(and(eq(listings.status, 'active'), gte(listings.publishedAt, since)))
			.groupBy(listings.cityId);

		const countMap = new Map(newCounts.map((r) => [r.cityId, Number(r.cnt)]));
		const citiesWithCounts = allCities.map((c) => ({
			...c,
			newCount: countMap.get(c.id) ?? 0
		}));

		return { cities: citiesWithCounts };
	} catch (e) {
		console.error('[layout] database unavailable', e);
		error(503, 'База данных недоступна. Проверьте DATABASE_URL на сервере.');
	}
};
