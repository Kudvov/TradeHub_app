import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listings, cities, categories } from '$lib/server/db/schema';
import { eq, and, ilike, sql, desc, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const citySlug = url.searchParams.get('city');
	const categorySlug = url.searchParams.get('category');
	const query = url.searchParams.get('q');
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
	const offset = (page - 1) * limit;

	// Build conditions
	const conditions = [eq(listings.status, 'active')];

	if (citySlug) {
		const city = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1);
		if (city.length > 0) {
			conditions.push(eq(listings.cityId, city[0].id));
		}
	}

	if (categorySlug) {
		const category = await db
			.select()
			.from(categories)
			.where(eq(categories.slug, categorySlug))
			.limit(1);
		if (category.length > 0) {
			conditions.push(eq(listings.categoryId, category[0].id));
		}
	}

	if (query) {
		conditions.push(
			sql`(${ilike(listings.title, `%${query}%`)} OR ${ilike(listings.description, `%${query}%`)})`
		);
	}

	const where = conditions.length > 1 ? and(...conditions) : conditions[0];

	// Get total count
	const [{ total }] = await db
		.select({ total: count() })
		.from(listings)
		.where(where);

	// Get paginated listings with relations
	const result = await db.query.listings.findMany({
		where,
		with: {
			city: true,
			category: true
		},
		orderBy: [desc(listings.publishedAt)],
		limit,
		offset
	});

	return json({
		data: result,
		total: Number(total),
		page,
		limit,
		totalPages: Math.ceil(Number(total) / limit)
	});
};
