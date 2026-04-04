import { parseListingPeriod } from '$lib/listing-period';
import { premiumTelegramUsernameForCityPage } from '$lib/premium-group';
import { setPreferredCityCookie } from '$lib/server/preferred-city-cookie';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
	const citySlug = params.city;
	const categorySlug = url.searchParams.get('category') ?? '';
	const query = url.searchParams.get('q') ?? '';
	const periodSlug = parseListingPeriod(url.searchParams.get('period'));
	const requestedPage = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const priceMin = url.searchParams.get('priceMin') ? parseFloat(url.searchParams.get('priceMin')!) : null;
	const priceMax = url.searchParams.get('priceMax') ? parseFloat(url.searchParams.get('priceMax')!) : null;
	const limit = 20;

	try {
		const { db } = await import('$lib/server/db');
		const { cities, categories, listings, telegramGroups } = await import('$lib/server/db/schema');
		const { listingHasPhotosSql } = await import('$lib/server/db/listing-photo-filter');
		const { listingPublishedInPeriodSql } = await import('$lib/server/listing-period-sql');
		const { eq, and, ilike, sql, desc, count, asc, inArray, gte, lte, isNotNull } = await import('drizzle-orm');

		const [city] = await db.select().from(cities).where(eq(cities.slug, citySlug)).limit(1);
		if (!city) throw error(404, 'Город не найден');

		setPreferredCityCookie(cookies, city.slug, url);

		const allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));

		const conditions = [eq(listings.status, 'active'), listingHasPhotosSql, eq(listings.cityId, city.id)];

		if (periodSlug) {
			conditions.push(listingPublishedInPeriodSql(periodSlug));
		}

		if (categorySlug) {
			const [cat] = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
			if (cat) conditions.push(eq(listings.categoryId, cat.id));
		}

		if (query) {
			// Полнотекстовый поиск: пробуем русскую морфологию, fallback на simple (для EN/KA слов)
			// websearch_to_tsquery понимает кавычки, OR, -, не падает на спецсимволы
			conditions.push(sql`(
				to_tsvector('russian', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.description}, ''))
				@@ websearch_to_tsquery('russian', ${query})
				OR
				to_tsvector('simple', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.description}, ''))
				@@ websearch_to_tsquery('simple', ${query})
			)`);
		}

		if (priceMin !== null) {
			conditions.push(isNotNull(listings.price));
			conditions.push(gte(listings.price, String(priceMin)));
		}
		if (priceMax !== null) {
			conditions.push(isNotNull(listings.price));
			conditions.push(lte(listings.price, String(priceMax)));
		}

		const where = and(...conditions);
		const [{ total }] = await db.select({ total: count() }).from(listings).where(where);
		const totalPages = Math.ceil(Number(total) / limit);
		const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
		const offset = (page - 1) * limit;

		// Сначала премиум-группа города (BatumiTradeHub / TbilisiTradeHub), затем остальные.
		const premiumUser = premiumTelegramUsernameForCityPage(citySlug);
		const premiumRank = premiumUser
			? sql`CASE WHEN ${telegramGroups.username} = ${premiumUser} THEN 0 ELSE 1 END`
			: sql`1`;
		const orderBy = categorySlug
			? [asc(premiumRank), desc(listings.publishedAt), desc(listings.id)]
			: [asc(premiumRank), desc(listings.createdAt), desc(listings.id)];

		const orderedIds = await db
			.select({ id: listings.id })
			.from(listings)
			.leftJoin(telegramGroups, eq(listings.telegramGroupId, telegramGroups.id))
			.where(where)
			.orderBy(...orderBy)
			.limit(limit)
			.offset(offset);

		const ids = orderedIds.map((r) => r.id);
		const rows =
			ids.length > 0
				? await db.query.listings.findMany({
						where: inArray(listings.id, ids),
						with: { city: true, category: true, telegramGroup: true }
					})
				: [];
		const orderMap = new Map(ids.map((id, i) => [id, i]));
		const result = [...rows].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

		return {
			city,
			categories: allCategories,
			listings: result,
			total: Number(total),
			page,
			limit,
			totalPages,
			filters: { categorySlug, query, periodSlug, priceMin, priceMax }
		};
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('[city] database error', e);
		error(503, 'База данных недоступна.');
	}
};
