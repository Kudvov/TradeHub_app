import { scrapeMessage } from './scraper';
import { db } from '../db';
import { listings, telegramGroups, cities } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// Количество подряд идущих ошибок "не найдено", после которых считаем,
// что достигли конца истории. Сообщения иногда удаляют, поэтому 1-2 ошибки — норма.
const MAX_CONSECUTIVE_ERRORS = 100;

async function syncGroup(
	groupHandle: string,
	groupId: number,
	cityId: number,
	startId: number,
	direction: 'up' | 'down' = 'up'
): Promise<number> {
	console.log(
		`\n⏳ Синхронизация @${groupHandle} (с ID: ${startId}, направление: ${direction})...`
	);

	let currentId = startId;
	let consecutiveErrors = 0;
	let added = 0;
	const limit = 2000;

	// Состояние текущего альбома (группы сообщений с одинаковым текстом)
	let albumText: string | null = null;
	let albumDate: string | null = null;
	let albumImages: string[] = [];
	let albumListingId: number | null = null; // ID записи в БД для обновления фото

	const flushAlbum = async () => {
		// Если у нас накопились фото для уже сохранённой записи — обновляем её
		if (albumListingId && albumImages.length > 0) {
			await db
				.update(listings)
				.set({ images: albumImages.slice(0, 10) })
				.where(eq(listings.id, albumListingId));
		}
		albumText = null;
		albumDate = null;
		albumImages = [];
		albumListingId = null;
	};

	while (consecutiveErrors < MAX_CONSECUTIVE_ERRORS && (direction === 'up' || added < limit)) {
		if (currentId <= 0) break;

		try {
			await new Promise((r) => setTimeout(r, 800));

			const parsed = await scrapeMessage(groupHandle, currentId);
			if (!parsed) {
				consecutiveErrors++;
				// Разрыв в ID — альбом закончился
				if (consecutiveErrors >= 2) await flushAlbum();
				direction === 'up' ? currentId++ : currentId--;
				continue;
			}

			consecutiveErrors = 0;

			const msgDateStr = parsed.date?.toDateString() ?? null;
			const isAlbumContinuation =
				albumText !== null &&
				parsed.text.trim() === albumText.trim() &&
				msgDateStr === albumDate;

			if (isAlbumContinuation) {
				// Сообщение — часть альбома, добавляем фото
				albumImages.push(...parsed.images);
				process.stdout.write('~');
			} else {
				// Новое объявление — сначала сбрасываем предыдущий альбом
				await flushAlbum();

				const existing = await db.query.listings.findFirst({
					where: eq(listings.telegramMessageId, BigInt(currentId))
				});

				if (!existing) {
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
							images: parsed.images,
							status: 'active',
							publishedAt: parsed.date || new Date()
						})
						.returning({ id: listings.id });

					albumListingId = inserted[0]?.id ?? null;
					added++;
					process.stdout.write('+');
				} else {
					albumListingId = existing.id;
					process.stdout.write('.');
				}

				// Начинаем новый потенциальный альбом
				albumText = parsed.text.trim();
				albumDate = msgDateStr;
				albumImages = [...parsed.images];
			}

			// Обновляем курсор только при движении вперёд
			if (direction === 'up') {
				await db
					.update(telegramGroups)
					.set({ lastMessageId: currentId, lastParsedAt: new Date() })
					.where(eq(telegramGroups.id, groupId));
			}
		} catch (err: any) {
			console.error(`❌ Ошибка на ID ${currentId}:`, err.message);
			consecutiveErrors++;
		}

		direction === 'up' ? currentId++ : currentId--;
	}

	// Сбрасываем последний альбом
	await flushAlbum();

	console.log(`\n✅ Готово. Добавлено: ${added}.`);
	return added;
}

// Находит приблизительный последний ID сообщения в группе.
// Стратегия: начинаем с высокого значения и идём вверх удвоением,
// затем бинарный поиск для точности.
// Telegram может иметь "дыры" (удалённые сообщения), поэтому проверяем
// несколько соседних ID вместо одного, чтобы не ошибиться.
async function findLatestMessageId(handle: string): Promise<number> {
	// Начинаем с 10000 — если нет, идём вниз, если есть — вверх
	const checkExists = async (id: number): Promise<boolean> => {
		// Проверяем 5 соседних ID — если хоть один есть, диапазон живой
		for (let delta = 0; delta <= 4; delta++) {
			const r = await scrapeMessage(handle, id + delta);
			await new Promise((res) => setTimeout(res, 300));
			if (r) return true;
		}
		return false;
	};

	// Шаг 1: найти верхнюю границу удвоением от 1000
	let probe = 1000;
	let found = false;
	while (probe <= 500000) {
		const exists = await checkExists(probe);
		if (!exists) {
			// Верхняя граница найдена
			found = true;
			break;
		}
		probe *= 2;
	}
	if (!found) probe = 500000;

	// Шаг 2: бинарный поиск между probe/2 и probe
	let lo = Math.max(1, Math.floor(probe / 2));
	let hi = probe;
	while (hi - lo > 50) {
		const mid = Math.floor((lo + hi) / 2);
		const exists = await checkExists(mid);
		if (exists) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return lo;
}

async function updateListingsCounts() {
	console.log('\n🔄 Обновляем счётчики объявлений по городам...');
	const allCities = await db.query.cities.findMany();
	for (const city of allCities) {
		const result = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(listings)
			.where(eq(listings.cityId, city.id));
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

			if (group.lastMessageId <= 1) {
				// Группа ещё не парсилась — качаем историю вниз
				let startId: number;
				if (group.startMessageId > 0) {
					// Используем заданный стартовый ID из БД
					startId = group.startMessageId;
					console.log(`\n📍 @${handle}: стартовый ID из БД: ${startId}, качаем историю вниз`);
				} else {
					// Автоопределяем верхний ID
					startId = await findLatestMessageId(handle);
					console.log(`\n📍 @${handle}: автоопределён верхний ID ~${startId}, качаем историю вниз`);
				}
				const added = await syncGroup(handle, group.id, group.cityId, startId, 'down');
				totalAdded += added;
				// Сохраняем верхний ID как курсор для следующего запуска
				await db
					.update(telegramGroups)
					.set({ lastMessageId: startId, lastParsedAt: new Date() })
					.where(eq(telegramGroups.id, group.id));
			} else {
				// Группа уже парсилась — подбираем новые сообщения вверх
				const added = await syncGroup(
					handle,
					group.id,
					group.cityId,
					group.lastMessageId,
					'up'
				);
				totalAdded += added;
			}
		}

		await updateListingsCounts();

		console.log(`\n🎉 Синхронизация завершена. Всего добавлено: ${totalAdded}.`);
	} catch (error) {
		console.error('Критическая ошибка:', error);
	} finally {
		process.exit(0);
	}
}

main();
