import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categories, listings } from '$lib/server/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const ADMIN_COOKIE = 'teleposter_admin_session';
const ADMIN_COOKIE_VALUE = 'ok';
const OLLAMA_URL = 'http://localhost:11434';

async function fetchOllama(path: string) {
	try {
		const res = await fetch(`${OLLAMA_URL}${path}`, {
			signal: AbortSignal.timeout(4000)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async ({ cookies }) => {
	if (cookies.get(ADMIN_COOKIE) !== ADMIN_COOKIE_VALUE) {
		error(401, 'Unauthorized');
	}

	const [tagsData, psData, allCategories, categoryRows, uncategorizedRow, totalRow] =
		await Promise.all([
			fetchOllama('/api/tags'),
			fetchOllama('/api/ps'),
			db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories),
			db
				.select({
					categoryId: listings.categoryId,
					count: sql<number>`count(*)::int`
				})
				.from(listings)
				.where(eq(listings.status, 'active'))
				.groupBy(listings.categoryId),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(listings)
				.where(sql`${listings.status} = 'active' and ${listings.categoryId} is null`),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(listings)
				.where(eq(listings.status, 'active'))
		]);

	const ollamaOnline = tagsData !== null;

	const models: { name: string; size: number; modifiedAt: string }[] =
		(tagsData?.models ?? []).map((m: { name: string; size: number; modified_at: string }) => ({
			name: m.name,
			size: m.size,
			modifiedAt: m.modified_at
		}));

	const running: { name: string; sizeVram: number }[] =
		(psData?.models ?? []).map((m: { name: string; size_vram: number }) => ({
			name: m.name,
			sizeVram: m.size_vram
		}));

	const categoryById = new Map(allCategories.map((c) => [c.id, c]));

	const categoryStats = categoryRows
		.filter((r) => r.categoryId !== null)
		.map((r) => {
			const cat = categoryById.get(r.categoryId!);
			return {
				slug: cat?.slug ?? 'unknown',
				name: cat?.name ?? '—',
				count: Number(r.count)
			};
		})
		.sort((a, b) => b.count - a.count);

	const uncategorized = Number(uncategorizedRow[0]?.count ?? 0);
	const total = Number(totalRow[0]?.count ?? 0);

	return json({
		ok: true,
		ollama: { online: ollamaOnline, models, running },
		categoryStats,
		uncategorized,
		total,
		at: new Date().toISOString()
	});
};
