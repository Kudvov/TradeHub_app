import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { allowMockDataFallback } from '$lib/server/allow-mock';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Неверный ID объявления');

	try {
		const { db } = await import('$lib/server/db');
		const { listings } = await import('$lib/server/db/schema');
		const { eq } = await import('drizzle-orm');

		const result = await db.query.listings.findFirst({
			where: eq(listings.id, id),
			with: {
				city: true,
				category: true,
				telegramGroup: true
			}
		});

		if (!result) throw error(404, 'Объявление не найдено');
		return { listing: result };
	} catch (e: unknown) {
		if (e && typeof e === 'object' && 'status' in e) throw e;

		if (!allowMockDataFallback()) {
			console.error('[listing] database error', e);
			error(503, 'База данных недоступна.');
		}

		const { mockListings } = await import('$lib/server/db/mock-data');
		const listing = mockListings.find((l) => l.id === id);
		if (!listing) throw error(404, 'Объявление не найдено');
		return { listing: { ...listing, telegramGroup: null } };
	}
};
