import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';
import { isContactBanned } from '../banned-contact-check';
import { db } from '../db';
import { listings, telegramGroups } from '../db/schema';
import { listingContentFingerprint } from './listing-dedupe';
import { probeHttpUrlOk, scrapeMessageWithKind, type ScrapeOutcome } from './scraper';

dotenv.config({ path: resolve(process.cwd(), '.env') });

export interface RefreshImagesOptions {
	limit?: number;
	sleepMs?: number;
	verbose?: boolean;
}

export interface RefreshImagesResult {
	scanned: number;
	updated: number;
	unchanged: number;
	missing: number;
	errors: number;
	/** Репарс не делали: сохранённые URL фото ещё отвечают */
	skippedStillAlive: number;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeGroupHandle(value: string): string {
	return value.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

function stableImages(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return Array.from(new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))).slice(
		0,
		10
	);
}

const MAX_URLS_TO_PROBE = Math.min(10, Number(process.env.REFRESH_IMAGE_PROBE_MAX ?? 8));
const PROBE_GAP_MS = Number(process.env.REFRESH_PROBE_GAP_MS ?? 80);

/**
 * true — хотя бы один сохранённый URL не открывается (протухший CDN и т.д.).
 * Пустой массив — не считаем протухшим (нечего проверять).
 */
export async function listingStoredImagesAreStale(images: unknown): Promise<boolean> {
	const urls = stableImages(images);
	if (urls.length === 0) return false;
	const slice = urls.slice(0, MAX_URLS_TO_PROBE);
	for (const u of slice) {
		const ok = await probeHttpUrlOk(u);
		if (!ok) return true;
		if (PROBE_GAP_MS > 0) await sleep(PROBE_GAP_MS);
	}
	return false;
}

export type ReparseListingResult =
	| { ok: true; action: 'updated' }
	| { ok: false; reason: 'missing' | 'non_listing' | 'banned' | 'no_telegram' };

/**
 * Повторная выгрузка объявления с t.me: текст, контакт, категория, фото.
 * Нужен telegram_message_id и группа с username.
 */
export async function reparseListingFromTelegramById(listingId: number): Promise<ReparseListingResult> {
	const rows = await db
		.select({
			id: listings.id,
			messageId: listings.telegramMessageId,
			groupUsername: telegramGroups.username
		})
		.from(listings)
		.innerJoin(telegramGroups, eq(telegramGroups.id, listings.telegramGroupId))
		.where(
			and(
				eq(listings.id, listingId),
				isNotNull(listings.telegramMessageId),
				isNotNull(listings.telegramGroupId),
				isNotNull(telegramGroups.username),
				ne(telegramGroups.username, '')
			)
		)
		.limit(1);

	const row = rows[0];
	if (!row?.messageId) return { ok: false, reason: 'no_telegram' };

	const handle = normalizeGroupHandle(String(row.groupUsername));
	const messageId = Number(row.messageId);
	const outcome = await scrapeMessageWithKind(handle, messageId);
	return applyListingReparseFromScrape(listingId, outcome);
}

async function applyListingReparseFromScrape(
	listingId: number,
	outcome: ScrapeOutcome
): Promise<ReparseListingResult> {
	if (outcome.kind === 'missing') return { ok: false, reason: 'missing' };
	if (outcome.kind === 'non_listing') return { ok: false, reason: 'non_listing' };

	const parsed = outcome.data;
	const extracted = parsed.extracted;

	if (extracted.contact && (await isContactBanned(extracted.contact))) {
		await db.update(listings).set({ status: 'filtered' }).where(eq(listings.id, listingId));
		return { ok: false, reason: 'banned' };
	}

	const fingerprint = listingContentFingerprint(extracted.title, extracted.description);
	const nextImages = stableImages(parsed.images);

	await db
		.update(listings)
		.set({
			title: extracted.title,
			description: extracted.description,
			price: extracted.price,
			currency: extracted.currency || 'GEL',
			contact: extracted.contact,
			categoryId: extracted.categoryId || 9,
			images: nextImages,
			contentHash: fingerprint,
			publishedAt: parsed.date ?? new Date()
		})
		.where(eq(listings.id, listingId));

	return { ok: true, action: 'updated' };
}

/**
 * Одно объявление: при наличии URL в БД проверяет их доступность; если протухли — полный репарс с t.me.
 * Без сохранённых фото — без запросов (шаг `skipped_no_images`).
 */
export async function verifyListingAndReparseIfImagesStale(listingId: number): Promise<
	| { ok: true; step: 'still_alive' | 'reparsed' | 'skipped_no_images' }
	| { ok: false; step: 'not_found' | 'missing' | 'non_listing' | 'banned' | 'no_telegram' }
> {
	const row = await db.query.listings.findFirst({
		where: and(eq(listings.id, listingId), eq(listings.status, 'active')),
		columns: { id: true, images: true }
	});
	if (!row) return { ok: false, step: 'not_found' };
	const urls = stableImages(row.images);
	if (urls.length === 0) return { ok: true, step: 'skipped_no_images' };
	if (!(await listingStoredImagesAreStale(row.images))) return { ok: true, step: 'still_alive' };
	const r = await reparseListingFromTelegramById(listingId);
	if (r.ok) return { ok: true, step: 'reparsed' };
	return { ok: false, step: r.reason };
}

/**
 * Проверяет сохранённые URL фото; при «протухании» тянет embed с t.me и обновляет объявление целиком.
 * Если REFRESH_PROBE_FIRST=0 — прежнее поведение: каждый раз скрапить и менять только при смене списка URL.
 */
export async function refreshRecentListingImages(options: RefreshImagesOptions = {}): Promise<RefreshImagesResult> {
	const limit = options.limit ?? Number(process.env.REFRESH_IMAGES_LIMIT ?? 300);
	const sleepMs = options.sleepMs ?? Number(process.env.REFRESH_SLEEP_MS ?? 450);
	const verbose = options.verbose ?? true;
	const probeFirst = process.env.REFRESH_PROBE_FIRST !== '0';
	const refreshEmpty = process.env.REFRESH_EMPTY_IMAGES === '1';

	const rows = await db
		.select({
			id: listings.id,
			messageId: listings.telegramMessageId,
			images: listings.images,
			groupUsername: telegramGroups.username
		})
		.from(listings)
		.innerJoin(telegramGroups, eq(telegramGroups.id, listings.telegramGroupId))
		.where(
			and(
				eq(listings.status, 'active'),
				isNotNull(listings.telegramMessageId),
				isNotNull(listings.telegramGroupId),
				isNotNull(telegramGroups.username),
				ne(telegramGroups.username, '')
			)
		)
		.orderBy(desc(listings.id))
		.limit(limit);

	let scanned = 0;
	let updated = 0;
	let unchanged = 0;
	let missing = 0;
	let errors = 0;
	let skippedStillAlive = 0;

	if (verbose) {
		console.log(`\n🖼️ Рефреш фото: до ${rows.length} объявлений (probeFirst=${probeFirst})...`);
	}

	for (const row of rows) {
		scanned++;
		const handle = normalizeGroupHandle(String(row.groupUsername));
		const messageId = Number(row.messageId);
		const prev = stableImages(row.images);

		try {
			let shouldScrape = !probeFirst;

			if (probeFirst) {
				if (prev.length > 0) {
					const stale = await listingStoredImagesAreStale(prev);
					shouldScrape = stale;
					if (!stale) {
						skippedStillAlive++;
						unchanged++;
						if (verbose) process.stdout.write('s');
						await sleep(sleepMs);
						continue;
					}
				} else {
					shouldScrape = refreshEmpty;
					if (!shouldScrape) {
						unchanged++;
						if (verbose) process.stdout.write('-');
						await sleep(sleepMs);
						continue;
					}
				}
			}

			const outcome = await scrapeMessageWithKind(handle, messageId);
			if (outcome.kind !== 'listing') {
				missing++;
				if (verbose) process.stdout.write('m');
				await sleep(sleepMs);
				continue;
			}

			if (!probeFirst) {
				const next = stableImages(outcome.data.images);
				const changed = next.length > 0 && JSON.stringify(next) !== JSON.stringify(prev);
				if (changed) {
					await db.update(listings).set({ images: next }).where(eq(listings.id, row.id));
					updated++;
					if (verbose) process.stdout.write('+');
				} else {
					unchanged++;
					if (verbose) process.stdout.write('.');
				}
			} else {
				const rep = await applyListingReparseFromScrape(row.id, outcome);
				if (rep.ok) {
					updated++;
					if (verbose) process.stdout.write('+');
				} else if (rep.reason === 'banned') {
					if (verbose) process.stdout.write('b');
				} else {
					missing++;
					if (verbose) process.stdout.write('m');
				}
			}
		} catch (error) {
			errors++;
			if (verbose) process.stdout.write('e');
			console.error(`\n[refresh-images] ошибка по listing ${row.id}:`, error);
		}

		await sleep(sleepMs);
	}

	if (verbose) {
		console.log('\n---');
		console.log(`Scanned: ${scanned}`);
		console.log(`Updated / репарс: ${updated}`);
		console.log(`Unchanged: ${unchanged}`);
		console.log(`Пропущено (фото ещё живы): ${skippedStillAlive}`);
		console.log(`Missing/non-listing: ${missing}`);
		console.log(`Errors: ${errors}`);
	}

	return { scanned, updated, unchanged, missing, errors, skippedStillAlive };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	refreshRecentListingImages().catch((error) => {
		console.error('❌ Ошибка рефреша фото:', error);
		process.exit(1);
	});
}
