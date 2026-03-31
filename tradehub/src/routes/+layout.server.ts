import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	try {
		const { db } = await import('$lib/server/db');
		const { cities } = await import('$lib/server/db/schema');
		const { asc } = await import('drizzle-orm');
		const allCities = await db.select().from(cities).orderBy(asc(cities.name));
		return { cities: allCities };
	} catch {
		// Fallback to mock data when DB is not available
		const { mockCities } = await import('$lib/server/db/mock-data');
		return { cities: mockCities };
	}
};
