import { db } from '../db';
import { cities, listings } from '../db/schema';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { extractData } from './extractor';
import { hasStopWords } from './stop-words';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH_SIZE = 500;

function buildListingText(title: string, description: string | null): string {
	return [title, description ?? ''].filter(Boolean).join('\n');
}

async function updateListingsCounts() {
	const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
	const allCities = await db.query.cities.findMany();
	for (const city of allCities) {
		const result = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(listings)
			.where(and(eq(listings.cityId, city.id), eq(listings.status, 'active'), gt(listings.publishedAt, since90d)));
		const count = result[0]?.count ?? 0;
		await db.update(cities).set({ listingsCount: count }).where(eq(cities.id, city.id));
	}
}

async function main() {
	console.log('♻️ Перепарс объявлений: фильтрация и перекатегоризация...');
	let lastId = 0;
	let scanned = 0;
	let blocked = 0;
	let recategorized = 0;

	while (true) {
		const batch = await db.query.listings.findMany({
			where: gt(listings.id, lastId),
			orderBy: [asc(listings.id)],
			limit: BATCH_SIZE
		});

		if (batch.length === 0) break;

		for (const listing of batch) {
			scanned++;
			lastId = listing.id;
			const text = buildListingText(listing.title, listing.description);

			if (hasStopWords(text)) {
				if (listing.status !== 'filtered') {
					await db
						.update(listings)
						.set({ status: 'filtered' })
						.where(eq(listings.id, listing.id));
					blocked++;
					process.stdout.write('x');
				} else {
					process.stdout.write('.');
				}
				continue;
			}

			const extracted = extractData(text, undefined);
			const nextCategoryId = extracted.categoryId || 9;
			const shouldActivate = listing.status !== 'active';
			const shouldRecategorize = listing.categoryId !== nextCategoryId;

			if (shouldActivate || shouldRecategorize) {
				await db
					.update(listings)
					.set({
						status: 'active',
						categoryId: nextCategoryId
					})
					.where(eq(listings.id, listing.id));

				if (shouldRecategorize) recategorized++;
				process.stdout.write('+');
			} else {
				process.stdout.write('.');
			}
		}
	}

	await updateListingsCounts();

	console.log('\n✅ Перепарс завершён');
	console.log(`Проверено: ${scanned}`);
	console.log(`Отфильтровано (status=filtered): ${blocked}`);
	console.log(`Перекатегоризировано: ${recategorized}`);
	process.exit(0);
}

main().catch((error) => {
	console.error('❌ Ошибка перепарса:', error);
	process.exit(1);
});
