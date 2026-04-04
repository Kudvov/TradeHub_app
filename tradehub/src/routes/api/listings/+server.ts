import { parseListingPeriod } from '$lib/listing-period';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listings, cities, categories } from '$lib/server/db/schema';
import { listingHasPhotosSql } from '$lib/server/db/listing-photo-filter';
import { listingPublishedInPeriodSql } from '$lib/server/listing-period-sql';
import { checkRateLimit, getClientIp } from '$lib/server/rate-limit';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const ip = getClientIp(request);
	if (!checkRateLimit(ip, { limit: 120, windowMs: 60_000 })) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const citySlug = url.searchParams.get('city');
	const categorySlug = url.searchParams.get('category');
	const query = url.searchParams.get('q');
	const periodSlug = parseListingPeriod(url.searchParams.get('period'));
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
	const offset = (page - 1) * limit;

	const conditions = [eq(listings.status, 'active'), listingHasPhotosSql];

	if (periodSlug) {
		conditions.push(listingPublishedInPeriodSql(periodSlug));
	}

	if (citySlug) {
		const city = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1);
		if (city.length > 0) {
			conditions.push(eq(listings.cityId, city[0].id));
		}
	}

	let filteredByCategory = false;
	if (categorySlug) {
		const category = await db
			.select()
			.from(categories)
			.where(eq(categories.slug, categorySlug))
			.limit(1);
		if (category.length > 0) {
			conditions.push(eq(listings.categoryId, category[0].id));
			filteredByCategory = true;
		}
	}

	if (query) {
		conditions.push(sql`(
			to_tsvector('russian', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.description}, ''))
			@@ websearch_to_tsquery('russian', ${query})
			OR
			to_tsvector('simple', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.description}, ''))
			@@ websearch_to_tsquery('simple', ${query})
		)`);
	}

	const where = conditions.length > 1 ? and(...conditions) : conditions[0];

	const orderBy = filteredByCategory
		? [desc(listings.publishedAt), desc(listings.id)]
		: [desc(listings.createdAt), desc(listings.id)];

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
		orderBy,
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
