import { isContactBanned } from '../banned-contact-check';
import { scrapeMessageWithKind } from './scraper';
import { db } from '../db';
import { listings, telegramGroups, cities } from '../db/schema';
import { listingHasPhotosSql } from '../db/listing-photo-filter';
import { and, eq, sql } from 'drizzle-orm';
import {
	listingContentFingerprint,
	normalizeListingContent,
	wordJaccard,
	TITLE_SIMILARITY_THRESHOLD
} from './listing-dedupe';
import { refreshRecentListingImages } from './refresh-images';
import { applyTypografToExtracted } from '../typograf-listing';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

/** Первое сообщение альбома без фото — вставка в БД откладывается, пока не придут кадры в continuation */
type AlbumDeferred = {
	messageId: number;
	fingerprint: string;
	title: string;
	description: string | null;
	price: string | null;
	currency: string;
	contact: string | null;
	categoryId: number;
	publishedAt: Date;
};

// Количество подряд идущих ошибок "не найдено", после которых считаем,
// что достигли конца (нет новых сообщений). Сообщения иногда удаляют, поэтому 1-2 ошибки — норма.
const MAX_CONSECUTIVE_ERRORS = 2000;

/** Пауза между HTTP-запросами к t.me (мс). */
const SYNC_MESSAGE_GAP_MS = Math.max(0, Number(process.env.SYNC_MESSAGE_GAP_MS ?? 220));
/** Реже обновлять last_message_id в БД (меньше round-trip к Postgres на длинной ленте) */
const SYNC_CURSOR_FLUSH_EVERY = Math.max(1, Math.floor(Number(process.env.SYNC_CURSOR_FLUSH_EVERY ?? 12)));

async function syncGroup(
	groupHandle: string,
	groupId: number,
	cityId: number,
	startId: number
): Promise<number> {
	console.log(`\n⏳ Синхронизация @${groupHandle} (с ID: ${startId}, направление: up)...`);

	let currentId = startId;
	let consecutiveErrors = 0;
	let added = 0;
	let skippedDuplicates = 0;

	let cursorFlushPending = 0;
	let lastCursorForDb: number | null = null;

	// Состояние текущего альбома (группы сообщений с одинаковым текстом)
	let albumText: string | null = null;
	let albumDate: string | null = null;
	let albumImages: string[] = [];
	let albumListingId: number | null = null; // ID записи в БД для обновления фото
	let albumDeferred: AlbumDeferred | null = null;

	const flushAlbum = async () => {
		// Если у нас накопились фото для уже сохранённой записи — обновляем её
		if (albumListingId && albumImages.length > 0) {
			await db
				.update(listings)
				.set({ images: albumImages.slice(0, 10) })
				.where(eq(listings.id, albumListingId));
		}
		albumDeferred = null;
		albumText = null;
		albumDate = null;
		albumImages = [];
		albumListingId = null;
	};

	while (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
		if (currentId <= 0) break;

		try {
			if (SYNC_MESSAGE_GAP_MS > 0) {
				await new Promise((r) => setTimeout(r, SYNC_MESSAGE_GAP_MS));
			}

			const outcome = await scrapeMessageWithKind(groupHandle, currentId);
			if (outcome.kind === 'missing') {
				consecutiveErrors++;
				if (consecutiveErrors >= 2) await flushAlbum();
				currentId++;
				continue;
			}

			// Пост есть, но без текста — не расходуем лимит «дыр» (иначе 0 объявлений)
			if (outcome.kind === 'non_listing') {
				consecutiveErrors = 0;
				if (albumText !== null) await flushAlbum();
				currentId++;
				continue;
			}

			const parsed = outcome.data;
			consecutiveErrors = 0;
			applyTypografToExtracted(parsed.extracted);

			const msgDateStr = parsed.date?.toDateString() ?? null;
			const isAlbumContinuation =
				albumText !== null &&
				parsed.text.trim() === albumText.trim() &&
				msgDateStr === albumDate;

			if (isAlbumContinuation) {
				albumImages.push(...parsed.images);
				if (albumListingId === null && albumDeferred && albumImages.length > 0) {
					const deferred = albumDeferred as AlbumDeferred;
					let closedDeferred = false;
					if (deferred.contact && (await isContactBanned(deferred.contact))) {
						albumDeferred = null;
						process.stdout.write('b');
						closedDeferred = true;
					}
					if (!closedDeferred) {
						const inserted = await db
							.insert(listings)
							.values({
								telegramMessageId: BigInt(deferred.messageId),
								telegramGroupId: groupId,
								cityId: cityId,
								categoryId: deferred.categoryId || 9,
								title: deferred.title,
								description: deferred.description,
								price: deferred.price,
								currency: deferred.currency || 'GEL',
								contact: deferred.contact,
								contentHash: deferred.fingerprint,
								images: albumImages.slice(0, 10),
								status: 'active',
								publishedAt: deferred.publishedAt
							})
							.returning({ id: listings.id });
						albumListingId = inserted[0]?.id ?? null;
						albumDeferred = null;
						added++;
						process.stdout.write('+');
					}
				} else {
					process.stdout.write('~');
				}
			} else {
				// Новое объявление — сначала сбрасываем предыдущий альбом
				await flushAlbum();

				const existing = await db.query.listings.findFirst({
					where: and(
						eq(listings.telegramGroupId, groupId),
						eq(listings.telegramMessageId, BigInt(currentId))
					)
				});

				if (!existing) {
					const fingerprint = listingContentFingerprint(
						parsed.extracted.title,
						parsed.extracted.description
					);

					// Дедуп в пределах города, даже если пост пришёл из другой группы.
					const duplicateByContent = await db.query.listings.findFirst({
						where: and(
							eq(listings.cityId, cityId),
							eq(listings.status, 'active'),
							eq(listings.contentHash, fingerprint)
						)
					});

					if (duplicateByContent) {
						skippedDuplicates++;
						// Если дубль пришёл с более полным набором фото — дополним существующую запись.
						if (parsed.images.length > 0) {
							const existingImages = Array.isArray(duplicateByContent.images)
								? duplicateByContent.images
								: [];
							const merged = Array.from(new Set([...existingImages, ...parsed.images])).slice(0, 10);
							if (merged.length > 0 && JSON.stringify(merged) !== JSON.stringify(existingImages)) {
								await db
									.update(listings)
									.set({ images: merged })
									.where(eq(listings.id, duplicateByContent.id));
							}
						}
						albumListingId = duplicateByContent.id;
						process.stdout.write('d');
					} else if (parsed.extracted.contact) {
						// Второй уровень дедупа: тот же контакт + похожий заголовок в городе.
						// Защищает от случаев, когда продавец слегка перефразировал объявление
						// или добавил emoji/ссылку — хеш стал другим, но товар тот же.
						const byContact = await db.query.listings.findMany({
							where: and(
								eq(listings.cityId, cityId),
								eq(listings.status, 'active'),
								eq(listings.contact, parsed.extracted.contact)
							),
							columns: { id: true, title: true, images: true }
						});

						const normNewTitle = normalizeListingContent(parsed.extracted.title, null);
						const contactDuplicate = byContact.find(
							(l) =>
								wordJaccard(normalizeListingContent(l.title, null), normNewTitle) >=
								TITLE_SIMILARITY_THRESHOLD
						);

						if (contactDuplicate) {
							skippedDuplicates++;
							// Дополняем фото у уже существующей записи
							if (parsed.images.length > 0) {
								const existingImages = Array.isArray(contactDuplicate.images)
									? contactDuplicate.images
									: [];
								const merged = Array.from(new Set([...existingImages, ...parsed.images])).slice(0, 10);
								if (merged.length > 0 && JSON.stringify(merged) !== JSON.stringify(existingImages)) {
									await db
										.update(listings)
										.set({ images: merged })
										.where(eq(listings.id, contactDuplicate.id));
								}
							}
							albumListingId = contactDuplicate.id;
							process.stdout.write('c');
						} else {
							// Не дубль по контакту — записываем новое объявление
							await insertNewListing();
						}
					} else {
						// Контакта нет — только хеш-дедуп, пишем новое объявление
						await insertNewListing();
					}

					async function insertNewListing() {
						if (parsed.extracted.contact && (await isContactBanned(parsed.extracted.contact))) {
							albumListingId = null;
							process.stdout.write('b');
							return;
						}

						if (parsed.images.length === 0) {
							albumDeferred = {
								messageId: currentId,
								fingerprint,
								title: parsed.extracted.title,
								description: parsed.extracted.description,
								price: parsed.extracted.price,
								currency: parsed.extracted.currency || 'GEL',
								contact: parsed.extracted.contact,
								categoryId: parsed.extracted.categoryId || 9,
								publishedAt: parsed.date || new Date()
							};
							albumListingId = null;
							process.stdout.write('o');
						} else {
							const inserted = await db
								.insert(listings)
								.values({
									telegramMessageId: BigInt(currentId),
									telegramGroupId: groupId,
									cityId: cityId,
									categoryId: parsed.extracted.categoryId || 9,
									title: parsed.extracted.title,
									description: parsed.extracted.description,
									price: parsed.extracted.price,
									currency: parsed.extracted.currency || 'GEL',
									contact: parsed.extracted.contact,
									contentHash: fingerprint,
									images: parsed.images,
									status: 'active',
									publishedAt: parsed.date || new Date()
								})
								.returning({ id: listings.id });

							albumListingId = inserted[0]?.id ?? null;
							added++;
							process.stdout.write('+');
						}
					}
				} else {
					albumListingId = existing.id;
					process.stdout.write('.');
				}

				// Начинаем новый потенциальный альбом
				albumText = parsed.text.trim();
				albumDate = msgDateStr;
				albumImages = [...parsed.images];
			}

			// Обновляем курсор пакетами — меньше нагрузка на БД
			lastCursorForDb = currentId;
			cursorFlushPending++;
			if (cursorFlushPending >= SYNC_CURSOR_FLUSH_EVERY) {
				await db
					.update(telegramGroups)
					.set({ lastMessageId: currentId, lastParsedAt: new Date() })
					.where(eq(telegramGroups.id, groupId));
				cursorFlushPending = 0;
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			const cause = err instanceof Error && err.cause != null ? err.cause : undefined;
			console.error(`❌ Ошибка на ID ${currentId}:`, msg, cause !== undefined ? { cause } : '');
			consecutiveErrors++;
		}

		currentId++;
	}

	if (cursorFlushPending > 0 && lastCursorForDb !== null) {
		await db
			.update(telegramGroups)
			.set({ lastMessageId: lastCursorForDb, lastParsedAt: new Date() })
			.where(eq(telegramGroups.id, groupId));
	}

	// Сбрасываем последний альбом
	await flushAlbum();

	console.log(
		`\n✅ Готово. Добавлено: ${added}. Пропущено дублей по тексту: ${skippedDuplicates}.`
	);
	return added;
}

async function updateListingsCounts() {
	console.log('\n🔄 Обновляем счётчики объявлений по городам...');
	const allCities = await db.query.cities.findMany();
	for (const city of allCities) {
		const result = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(listings)
			.where(and(eq(listings.cityId, city.id), eq(listings.status, 'active'), listingHasPhotosSql));
		const count = result[0]?.count ?? 0;
		await db.update(cities).set({ listingsCount: count }).where(eq(cities.id, city.id));
		console.log(`  ${city.name}: ${count} объявлений`);
	}
}

async function main() {
	console.log('🚀 Запуск синхронизатора Telegram...');

	try {
		const groups = await db.query.telegramGroups.findMany({
			where: eq(telegramGroups.isActive, true)
		});

		let totalAdded = 0;

		for (const group of groups) {
			if (!group.username) continue;

			const handle = group.username
				.replace('https://t.me/', '')
				.replace('@', '')
				.replace(/\/$/, '');

			// Определяем стартовый ID: приоритет у lastMessageId (курсор прошлого запуска),
			// затем startMessageId (задан вручную в админке), иначе — пропускаем группу.
			const startId =
				group.lastMessageId > 1
					? group.lastMessageId
					: group.startMessageId > 0
						? group.startMessageId
						: 0;

			if (startId <= 0) {
				console.log(`\n⚠️  @${handle}: не задан стартовый ID — пропускаем. Укажите startMessageId в админке.`);
				continue;
			}

			const added = await syncGroup(handle, group.id, group.cityId, startId);
			totalAdded += added;
		}

		await updateListingsCounts();
		// Обновляем протухшие ссылки фото у последних объявлений.
		// Можно отключить: REFRESH_IMAGES_AFTER_SYNC=0
		if (process.env.REFRESH_IMAGES_AFTER_SYNC !== '0') {
			const limit = Number(process.env.REFRESH_IMAGES_LIMIT ?? 60);
			const sleepMs = Number(process.env.REFRESH_SLEEP_MS ?? 180);
			await refreshRecentListingImages({ limit, sleepMs, verbose: true });
		}

		console.log(`\n🎉 Синхронизация завершена. Всего добавлено: ${totalAdded}.`);
	} catch (error) {
		console.error('Критическая ошибка:', error);
	} finally {
		process.exit(0);
	}
}

main();
