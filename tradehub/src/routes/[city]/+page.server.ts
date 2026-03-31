import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { allowMockDataFallback } from '$lib/server/allow-mock';

export const load: PageServerLoad = async ({ params, url }) => {
	const citySlug = params.city;
	const categorySlug = url.searchParams.get('category') ?? '';
	const query = url.searchParams.get('q') ?? '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = 20;

	try {
		const { db } = await import('$lib/server/db');
		const { cities, categories, listings } = await import('$lib/server/db/schema');
		const { eq, and, ilike, sql, desc, count, asc } = await import('drizzle-orm');

		const [city] = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1);
		if (!city) throw error(404, 'Город не найден');

		const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));

		const conditions = [eq(listings.status, 'active'), eq(listings.cityId, city.id)];

		if (categorySlug) {
			const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
			if (cat) conditions.push(eq(listings.categoryId, cat.id));
		}

		if (query) {
			conditions.push(
				sql`(${ilike(listings.title, `%${query}%`)} OR ${ilike(listings.description, `%${query}%`)})`
			);
		}

		const where = and(...conditions);
		const offset = (page - 1) * limit;
		const [{ total }] = await db.select({ total: count() }).from(listings).where(where);

		const result = await db.query.listings.findMany({
			where,
			with: { city: true, category: true },
			orderBy: [desc(listings.publishedAt)],
			limit,
			offset
		});

		return {
			city,
			categories: allCategories,
			listings: result,
			total: Number(total),
			page,
			limit,
			totalPages: Math.ceil(Number(total) / limit),
			filters: { categorySlug, query }
		};
	} catch (e: unknown) {
		// If it's an HTTP error from SvelteKit, re-throw
		if (e && typeof e === 'object' && 'status' in e) throw e;

		if (!allowMockDataFallback()) {
			console.error('[city] database error', e);
			error(503, 'База данных недоступна.');
		}

		// Dev-only: mock data без PostgreSQL
		const { mockCities, mockCategories, mockListings } = await import('$lib/server/db/mock-data');
		const city = mockCities.find((c) => c.slug === citySlug);
		if (!city) throw error(404, 'Город не найден');

		let filtered = mockListings.filter((l) => l.cityId === city.id);

		if (categorySlug) {
			const cat = mockCategories.find((c) => c.slug === categorySlug);
			if (cat) filtered = filtered.filter((l) => l.categoryId === cat.id);
		}

		if (query) {
			const q = query.toLowerCase();
			filtered = filtered.filter(
				(l) => l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
			);
		}

		const total = filtered.length;
		const offset = (page - 1) * limit;
		const paginated = filtered.slice(offset, offset + limit);

		return {
			city,
			categories: mockCategories,
			listings: paginated,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
			filters: { categorySlug, query }
		};
	}
};
