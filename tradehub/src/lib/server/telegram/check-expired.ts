/**
 * Проверка актуальности объявлений на t.me.
 *
 * Каждый запуск берёт пачку активных объявлений, которые дольше всего не проверялись
 * (сначала те, у кого checkedAt = NULL), и проверяет каждое через t.me embed:
 *
 *   missing     → статус 'expired'  (пост удалён)
 *   non_listing → статус 'expired'  (текст убрали — объявление больше не актуально)
 *   listing     → обновляем checkedAt, при изменении текста/фото — обновляем данные
 *
 * Переменные окружения:
 *   CHECKER_BATCH      — сколько объявлений за один прогон (default: 80)
 *   CHECKER_SLEEP_MS   — пауза между запросами к t.me в мс (default: 300)
 *   CHECKER_VERBOSE    — '0' чтобы отключить подробный вывод
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { and, asc, eq, isNotNull, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '../db';
import { listings, telegramGroups, cities } from '../db/schema';
import { scrapeMessageWithKind } from './scraper';
import { listingContentFingerprint } from './listing-dedupe';
import { isContactBanned } from '../banned-contact-check';
import { listingHasPhotosSql } from '../db/listing-photo-filter';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH = Math.max(1, Number(process.env.CHECKER_BATCH ?? 80));
const SLEEP_MS = Math.max(0, Number(process.env.CHECKER_SLEEP_MS ?? 300));
const VERBOSE = process.env.CHECKER_VERBOSE !== '0';

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function normalizeHandle(v: string): string {
	return v.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

function stableImages(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return Array.from(
		new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))
	).slice(0, 10);
}

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
	console.log(`🔍 Проверка актуальности объявлений (batch=${BATCH}, sleep=${SLEEP_MS}ms)...`);

	// Порядок: сначала никогда не проверявшиеся (checkedAt IS NULL),
	// затем самые давно проверенные (checkedAt ASC).
	// Берём только объявления с привязанным telegram-постом.
	const rows = await db
		.select({
			id: listings.id,
			title: listings.title,
			description: listings.description,
			price: listings.price,
			currency: listings.currency,
			categoryId: listings.categoryId,
			images: listings.images,
			contact: listings.contact,
			messageId: listings.telegramMessageId,
			groupUsername: telegramGroups.username,
			checkedAt: listings.checkedAt
		})
		.from(listings)
		.innerJoin(telegramGroups, eq(telegramGroups.id, listings.telegramGroupId))
		.where(
			and(
				eq(listings.status, 'active'),
				isNotNull(listings.telegramMessageId),
				isNotNull(listings.telegramGroupId),
				isNotNull(telegramGroups.username),
				ne(telegramGroups.username, ''),
				// Не проверялись совсем ИЛИ проверялись более 23 часов назад
				or(
					isNull(listings.checkedAt),
					lt(listings.checkedAt, new Date(Date.now() - 23 * 60 * 60 * 1000))
				)
			)
		)
		.orderBy(asc(listings.checkedAt))
		.limit(BATCH);

	if (rows.length === 0) {
		console.log('✅ Нечего проверять — все объявления актуальны.');
		return;
	}

	console.log(`Найдено для проверки: ${rows.length}`);

	let expired = 0;
	let updated = 0;
	let ok = 0;
	let errors = 0;
	const now = new Date();

	for (const row of rows) {
		const handle = normalizeHandle(String(row.groupUsername));
		const messageId = Number(row.messageId);

		try {
			if (SLEEP_MS > 0) await sleep(SLEEP_MS);

			const outcome = await scrapeMessageWithKind(handle, messageId);

			if (outcome.kind === 'missing' || outcome.kind === 'non_listing') {
				// Пост удалён или больше не является объявлением
				await db
					.update(listings)
					.set({ status: 'expired', checkedAt: now })
					.where(eq(listings.id, row.id));
				expired++;
				if (VERBOSE) process.stdout.write('x');
				continue;
			}

			// Пост существует — обновляем данные если изменились
			const parsed = outcome.data;
			const extracted = parsed.extracted;

			// Если контакт попал в бан пока объявление висело
			if (extracted.contact && (await isContactBanned(extracted.contact))) {
				await db
					.update(listings)
					.set({ status: 'filtered', checkedAt: now })
					.where(eq(listings.id, row.id));
				expired++;
				if (VERBOSE) process.stdout.write('b');
				continue;
			}

			const newImages = stableImages(parsed.images);
			const newFingerprint = listingContentFingerprint(extracted.title, extracted.description);

			const oldImages = stableImages(row.images);
			const imagesChanged = JSON.stringify(newImages) !== JSON.stringify(oldImages) && newImages.length > 0;
			const contentChanged =
				extracted.title !== row.title ||
				extracted.description !== row.description ||
				extracted.price !== row.price ||
				extracted.contact !== row.contact;

			if (imagesChanged || contentChanged) {
				await db
					.update(listings)
					.set({
						title: extracted.title,
						description: extracted.description,
						price: extracted.price,
						currency: extracted.currency || row.currency || 'GEL',
						contact: extracted.contact,
						categoryId: extracted.categoryId || row.categoryId || 9,
						images: imagesChanged ? newImages : oldImages,
						contentHash: newFingerprint,
						checkedAt: now
					})
					.where(eq(listings.id, row.id));
				updated++;
				if (VERBOSE) process.stdout.write('+');
			} else {
				await db
					.update(listings)
					.set({ checkedAt: now })
					.where(eq(listings.id, row.id));
				ok++;
				if (VERBOSE) process.stdout.write('.');
			}
		} catch (err) {
			errors++;
			if (VERBOSE) process.stdout.write('e');
			console.error(`\n❌ Ошибка проверки listing ${row.id} (${handle}/${messageId}):`, err);
		}
	}

	if (VERBOSE) console.log('');

	console.log(`✅ Проверено: ${rows.length}`);
	console.log(`   Удалено/истекло (expired): ${expired}`);
	console.log(`   Обновлено данных: ${updated}`);
	console.log(`   Без изменений: ${ok}`);
	console.log(`   Ошибки: ${errors}`);

	if (expired > 0) {
		console.log('\n🔄 Обновляем счётчики городов...');
		await updateListingsCounts();
	}
}

main()
	.catch((err) => {
		console.error('❌ Критическая ошибка check-expired:', err);
		process.exit(1);
	})
	.finally(() => process.exit(0));
