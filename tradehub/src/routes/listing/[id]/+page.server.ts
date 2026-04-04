import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Неверный ID объявления');

	try {
		const { db } = await import('$lib/server/db');
		const { listings } = await import('$lib/server/db/schema');
		const { listingHasPhotosSql } = await import('$lib/server/db/listing-photo-filter');
		const { and, desc, eq, ne } = await import('drizzle-orm');

		// Ищем без фильтра статуса — чтобы отличить «удалено» от «не существует»
		const raw = await db.query.listings.findFirst({
			where: eq(listings.id, id),
			with: { city: true, category: true, telegramGroup: true }
		});

		// ID вообще не существует — настоящий 404
		if (!raw) throw error(404, 'Объявление не найдено');

		const isGone = raw.status === 'expired' || raw.status === 'filtered';
		// active, но без фото — тоже считаем недоступным для показа
		const hasPhotos = Array.isArray(raw.images) && raw.images.length > 0;
		const unavailable = isGone || (!hasPhotos && raw.status === 'active');

		// Подбираем похожие объявления (для обоих случаев — и живых, и ушедших)
		const relatedLimit = 4;
		const cityId = raw.cityId;
		const categoryId = raw.categoryId;

		const relatedPrimary = categoryId
			? await db.query.listings.findMany({
					where: and(
						eq(listings.status, 'active'),
						listingHasPhotosSql,
						eq(listings.cityId, cityId),
						eq(listings.categoryId, categoryId),
						ne(listings.id, id)
					),
					with: { city: true, category: true, telegramGroup: true },
					orderBy: [desc(listings.publishedAt)],
					limit: relatedLimit
				})
			: [];

		const missing = relatedLimit - relatedPrimary.length;
		const relatedFallbackConditions = [
			eq(listings.status, 'active'),
			listingHasPhotosSql,
			eq(listings.cityId, cityId),
			ne(listings.id, id)
		];
		if (categoryId) relatedFallbackConditions.push(ne(listings.categoryId, categoryId));

		const relatedFallback =
			missing > 0
				? await db.query.listings.findMany({
						where: and(...relatedFallbackConditions),
						with: { city: true, category: true, telegramGroup: true },
						orderBy: [desc(listings.publishedAt)],
						limit: missing
					})
				: [];

		const relatedListings = [...relatedPrimary, ...relatedFallback];

		if (unavailable) {
			// Возвращаем заглушку с городом и похожими — не бросаем 404
			return {
				gone: true as const,
				city: raw.city,
				relatedListings,
				listing: null
			};
		}

		return { gone: false as const, listing: raw, relatedListings };
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
