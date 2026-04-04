import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { checkRateLimit, getClientIp } from '$lib/server/rate-limit';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	if (!checkRateLimit(getClientIp(request), { limit: 60, windowMs: 60_000 })) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}
	const allCategories = await db
		.select()
		.from(categories)
		.orderBy(asc(categories.sortOrder));
	return json(allCategories);
};
