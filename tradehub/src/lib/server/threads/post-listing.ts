/**
 * Threads API — публикация объявлений
 *
 * Docs: https://developers.facebook.com/docs/threads/posts
 *
 * Флоу:
 *   1. POST /me/threads         → создаём контейнер (creation_id)
 *   2. POST /me/threads_publish → публикуем контейнер
 *
 * Запуск: npm run threads:post
 */

import 'dotenv/config';
import { db } from '../db/index.js';
import { listings, cities, categories } from '../db/schema.js';
import { eq, and, isNotNull, desc, sql } from 'drizzle-orm';

const BASE_URL = 'https://graph.threads.net/v1.0';
const TOKEN = process.env.THREADS_ACCESS_TOKEN;
const SITE_URL = process.env.THREADS_SITE_URL ?? 'http://155.212.134.183';

// Сколько объявлений постить за один запуск
const POST_LIMIT = parseInt(process.env.THREADS_POST_LIMIT ?? '3', 10);

// Минимальная цена для поста (фильтруем мусор)
const MIN_PRICE = parseFloat(process.env.THREADS_MIN_PRICE ?? '0');

if (!TOKEN) {
	console.error('❌ THREADS_ACCESS_TOKEN не задан в .env');
	process.exit(1);
}

// ─── Типы ──────────────────────────────────────────────────────────────────

interface ThreadsPostResult {
	id: string;
}

// ─── API helpers ───────────────────────────────────────────────────────────

async function createContainer(params: Record<string, string>): Promise<string> {
	const url = new URL(`${BASE_URL}/me/threads`);
	const body = new URLSearchParams({ ...params, access_token: TOKEN! });

	const res = await fetch(url.toString(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString()
	});

	const json = (await res.json()) as { id?: string; error?: { message: string } };
	if (!res.ok || !json.id) {
		throw new Error(`createContainer failed: ${json.error?.message ?? JSON.stringify(json)}`);
	}
	return json.id;
}

async function publishContainer(creationId: string): Promise<ThreadsPostResult> {
	const url = new URL(`${BASE_URL}/me/threads_publish`);
	const body = new URLSearchParams({
		creation_id: creationId,
		access_token: TOKEN!
	});

	const res = await fetch(url.toString(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString()
	});

	const json = (await res.json()) as ThreadsPostResult & { error?: { message: string } };
	if (!res.ok || !json.id) {
		throw new Error(`publishContainer failed: ${(json as any).error?.message ?? JSON.stringify(json)}`);
	}
	return json;
}

// ─── Форматирование поста ──────────────────────────────────────────────────

function formatPost(listing: {
	id: number;
	title: string;
	price: string | null;
	currency: string;
	cityName: string;
	categoryName: string | null;
	contact: string | null;
}): string {
	const lines: string[] = [];

	// Заголовок
	lines.push(listing.title);
	lines.push('');

	// Цена
	if (listing.price && parseFloat(listing.price) > 0) {
		const priceNum = parseFloat(listing.price);
		const priceFormatted = new Intl.NumberFormat('ru-RU').format(priceNum);
		lines.push(`💰 ${priceFormatted} ${listing.currency}`);
	}

	// Город и категория
	const meta = [listing.cityName, listing.categoryName].filter(Boolean).join(' · ');
	if (meta) lines.push(`📍 ${meta}`);

	// Ссылка на объявление
	lines.push('');
	lines.push(`🔗 ${SITE_URL}/listing/${listing.id}`);

	// Хештеги
	lines.push('');
	lines.push('#teleposter #объявления #барахолка #Грузия');

	return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
	console.log(`🧵 Threads: постим ${POST_LIMIT} объявлений...`);

	// Берём свежие активные объявления с изображениями и ценой
	const rows = await db
		.select({
			id: listings.id,
			title: listings.title,
			price: listings.price,
			currency: listings.currency,
			contact: listings.contact,
			images: listings.images,
			cityName: cities.name,
			categoryName: categories.name
		})
		.from(listings)
		.leftJoin(cities, eq(listings.cityId, cities.id))
		.leftJoin(categories, eq(listings.categoryId, categories.id))
		.where(
			and(
				eq(listings.status, 'active'),
				isNotNull(listings.images),
				MIN_PRICE > 0
					? sql`CAST(${listings.price} AS NUMERIC) >= ${MIN_PRICE}`
					: sql`1=1`
			)
		)
		.orderBy(desc(listings.publishedAt))
		.limit(POST_LIMIT);

	if (rows.length === 0) {
		console.log('⚠️  Нет подходящих объявлений для постинга');
		return;
	}

	let posted = 0;

	for (const row of rows) {
		const images = (row.images as string[]) ?? [];
		const imageUrl = images[0];
		const text = formatPost({
			id: row.id,
			title: row.title,
			price: row.price,
			currency: row.currency,
			cityName: row.cityName ?? '',
			categoryName: row.categoryName ?? null,
			contact: row.contact
		});

		try {
			let creationId: string;

			if (imageUrl) {
				// Пост с изображением
				creationId = await createContainer({
					media_type: 'IMAGE',
					image_url: imageUrl,
					text
				});
			} else {
				// Текстовый пост
				creationId = await createContainer({
					media_type: 'TEXT',
					text
				});
			}

			// Небольшая пауза перед публикацией (рекомендация Meta)
			await new Promise((r) => setTimeout(r, 1000));

			const result = await publishContainer(creationId);
			console.log(`✅ Опубликовано: "${row.title.slice(0, 40)}..." → threads post ${result.id}`);
			posted++;

			// Пауза между постами
			await new Promise((r) => setTimeout(r, 2000));
		} catch (err) {
			console.error(`❌ Ошибка для listing ${row.id}:`, err);
		}
	}

	console.log(`\n🎉 Готово: опубликовано ${posted} из ${rows.length}`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
