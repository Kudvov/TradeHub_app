import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Неверный ID объявления');

	try {
		const { db } = await import('$lib/server/db');
		const { listings } = await import('$lib/server/db/schema');
		const { and, desc, eq, ne } = await import('drizzle-orm');

		const result = await db.query.listings.findFirst({
			where: eq(listings.id, id),
			with: {
				city: true,
				category: true,
				telegramGroup: true
			}
		});

		if (!result) throw error(404, 'Объявление не найдено');

		const relatedLimit = 4;
		const relatedPrimary = result.categoryId
			? await db.query.listings.findMany({
					where: and(
						eq(listings.status, 'active'),
						eq(listings.cityId, result.cityId),
						eq(listings.categoryId, result.categoryId),
						ne(listings.id, result.id)
					),
					with: {
						city: true,
						category: true
					},
					orderBy: [desc(listings.publishedAt)],
					limit: relatedLimit
				})
			: [];

		const missing = relatedLimit - relatedPrimary.length;
		const relatedFallbackConditions = [
			eq(listings.status, 'active'),
			eq(listings.cityId, result.cityId),
			ne(listings.id, result.id)
		];
		if (result.categoryId) {
			relatedFallbackConditions.push(ne(listings.categoryId, result.categoryId));
		}

		const relatedFallback =
			missing > 0
				? await db.query.listings.findMany({
						where: and(...relatedFallbackConditions),
						with: {
							city: true,
							category: true
						},
						orderBy: [desc(listings.publishedAt)],
						limit: missing
					})
				: [];

		return { listing: result, relatedListings: [...relatedPrimary, ...relatedFallback] };
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('[listing] database error', e);
		error(503, 'База данных недоступна.');
	}
};

export const actions: Actions = {
	report: async ({ params, request }) => {
		const id = parseInt(params.id);
		if (isNaN(id)) return fail(400, { success: false, error: 'Неверный ID объявления' });

		const formData = await request.formData();
		const reason = String(formData.get('reason') ?? '').trim();
		const details = String(formData.get('details') ?? '').trim();
		const allowedReasons = new Set(['spam', 'fraud', 'prohibited', 'duplicate', 'other']);
		if (!allowedReasons.has(reason)) {
			return fail(400, { success: false, error: 'Выберите причину жалобы.' });
		}

		try {
			const { db } = await import('$lib/server/db');
			const { listings, listingReports } = await import('$lib/server/db/schema');
			const { eq } = await import('drizzle-orm');

			const listing = await db.query.listings.findFirst({ where: eq(listings.id, id) });
			if (!listing) return fail(404, { success: false, error: 'Объявление не найдено.' });

			await db.insert(listingReports).values({
				listingId: id,
				reason,
				details: details || null,
				status: 'open'
			});
			return { success: true, message: 'Жалоба отправлена. Спасибо!' };
		} catch (e) {
			console.error('[listing][report] error', e);
			return fail(500, { success: false, error: 'Не удалось отправить жалобу.' });
		}
	}
};
