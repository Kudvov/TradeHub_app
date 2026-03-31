import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { allowMockDataFallback } from '$lib/server/allow-mock';

export const load: LayoutServerLoad = async () => {
	try {
		const { db } = await import('$lib/server/db');
		const { cities } = await import('$lib/server/db/schema');
		const { asc } = await import('drizzle-orm');
		const allCities = await db.select().from(cities).orderBy(asc(cities.name));
		return { cities: allCities };
	} catch (e) {
		if (allowMockDataFallback()) {
			const { mockCities } = await import('$lib/server/db/mock-data');
			return { cities: mockCities };
		}
		console.error('[layout] database unavailable', e);
		error(503, 'База данных недоступна. Проверьте DATABASE_URL на сервере.');
	}
};
