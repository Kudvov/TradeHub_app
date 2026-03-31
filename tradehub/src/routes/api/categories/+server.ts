import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allCategories = await db
		.select()
		.from(categories)
		.orderBy(asc(categories.sortOrder));
	return json(allCategories);
};
