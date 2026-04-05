/**
 * Прогоняет объявления через AI-классификатор (Gemini, см. classifier.ts).
 * - NOT_LISTING → status = 'filtered'
 * - listing     → обновляет categoryId (status не трогаем, кроме фильтра)
 *
 * Запуск: npm run parser:ai-reclassify
 * Только active (по умолчанию). Вся таблица listings:
 *   AI_RECLASSIFY_ALL=1 npm run parser:ai-reclassify
 */

import { db } from '../db';
import { cities, listings } from '../db/schema';
import { listingHasPhotosSql } from '../db/listing-photo-filter';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { categoryIdFromSlug } from './category-ids';
import { classifyListing } from './classifier';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH_SIZE = 50;

async function updateListingsCounts() {
	const allCities = await db.query.cities.findMany();
	for (const city of allCities) {
		const result = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(listings)
			.where(and(eq(listings.cityId, city.id), eq(listings.status, 'active'), listingHasPhotosSql));
		const count = result[0]?.count ?? 0;
		await db.update(cities).set({ listingsCount: count }).where(eq(cities.id, city.id));
	}
}

async function main() {
	const DRY_RUN = process.env.DRY_RUN === '1';
	const allRows = process.env.AI_RECLASSIFY_ALL === '1';
	console.log(
		`🤖 AI-реклассификация${allRows ? ' (все строки listings)' : ' (только active)'}${DRY_RUN ? ' — DRY RUN' : ''}...`
	);
	console.log('Символы: x=отфильтровано  c=категория изменена  .=без изменений  ?=ошибка API\n');

	let lastId = 0;
	let scanned = 0;
	let filtered = 0;
	let recategorized = 0;
	let errors = 0;

	while (true) {
		const whereClause = allRows ? gt(listings.id, lastId) : and(eq(listings.status, 'active'), gt(listings.id, lastId));
		const batch = await db.query.listings.findMany({
			where: whereClause,
			orderBy: [asc(listings.id)],
			limit: BATCH_SIZE,
			columns: { id: true, title: true, description: true, categoryId: true }
		});

		if (batch.length === 0) break;

		for (const listing of batch) {
			scanned++;
			lastId = listing.id;

			const text = [listing.title, listing.description ?? ''].filter(Boolean).join('\n');

			let result;
			try {
				result = await classifyListing(text);
			} catch {
				errors++;
				process.stdout.write('?');
				continue;
			}

			if (!result.isListing) {
				if (!DRY_RUN) {
					await db
						.update(listings)
						.set({ status: 'filtered' })
						.where(eq(listings.id, listing.id));
				}
				filtered++;
				process.stdout.write('x');
				continue;
			}

			const newCategoryId = categoryIdFromSlug(result.categorySlug);
			if (listing.categoryId !== newCategoryId) {
				if (!DRY_RUN) {
					await db
						.update(listings)
						.set({ categoryId: newCategoryId })
						.where(eq(listings.id, listing.id));
				}
				recategorized++;
				process.stdout.write('c');
			} else {
				process.stdout.write('.');
			}
		}
	}

	if (!DRY_RUN) {
		await updateListingsCounts();
	}

	console.log('\n\n✅ Готово');
	console.log(`Проверено:            ${scanned}`);
	console.log(`Отфильтровано (NOT):  ${filtered}`);
	console.log(`Категория обновлена:  ${recategorized}`);
	console.log(`Ошибки API:           ${errors}`);
	process.exit(0);
}

main().catch((e) => {
	console.error('❌ Ошибка:', e);
	process.exit(1);
});
