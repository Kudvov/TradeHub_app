import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cities } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const allCities = await db.select().from(cities).orderBy(asc(cities.name));
	return json(allCities);
};
