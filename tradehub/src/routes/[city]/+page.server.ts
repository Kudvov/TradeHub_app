import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const citySlug = params.city;
	const categorySlug = url.searchParams.get('category') ?? '';
	const query = url.searchParams.get('q') ?? '';
	const requestedPage = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = 20;

	try {
		const { db } = await import('$lib/server/db');
		const { cities, categories, listings } = await import('$lib/server/db/schema');
		const { eq, and, ilike, sql, desc, count, asc, gte } = await import('drizzle-orm');

		const [city] = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1);
		if (!city) throw error(404, 'Город не найден');

		const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));

		const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
		const conditions = [eq(listings.status, 'active'), eq(listings.cityId, city.id), gte(listings.publishedAt, since90d)];

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
		const [{ total }] = await db.select({ total: count() }).from(listings).where(where);
		const totalPages = Math.ceil(Number(total) / limit);
		const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
		const offset = (page - 1) * limit;

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
			totalPages,
			filters: { categorySlug, query }
		};
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('[city] database error', e);
		error(503, 'База данных недоступна.');
	}
};
