import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { and, asc, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { db } from '../db';
import { listings } from '../db/schema';
import { normalizeListingContent, wordJaccard, TITLE_SIMILARITY_THRESHOLD } from './listing-dedupe';

dotenv.config({ path: resolve(process.cwd(), '.env') });

type DuplicateGroup = {
	cityId: number;
	contentHash: string;
	count: number;
};

type ContactGroup = {
	cityId: number;
	contact: string;
	count: number;
};

function uniqImages(items: unknown[]): string[] {
	return Array.from(
		new Set(items.filter((v): v is string => typeof v === 'string' && v.length > 0))
	).slice(0, 10);
}

// ─── Проход 1: точные дубли по contentHash ────────────────────────────────

async function cleanupByContentHash(apply: boolean): Promise<{ groups: number; filtered: number; updated: number }> {
	const groups = (await db
		.select({
			cityId: listings.cityId,
			contentHash: listings.contentHash,
			count: sql<number>`count(*)::int`
		})
		.from(listings)
		.where(and(eq(listings.status, 'active'), isNotNull(listings.contentHash)))
		.groupBy(listings.cityId, listings.contentHash)
		.having(sql`count(*) > 1`)
		.orderBy(desc(sql`count(*)::int`))
		.limit(100_000)) as DuplicateGroup[];

	let groupsProcessed = 0;
	let filteredRows = 0;
	let updatedKeepers = 0;

	for (const group of groups) {
		groupsProcessed++;

		const rows = await db.query.listings.findMany({
			where: and(
				eq(listings.status, 'active'),
				eq(listings.cityId, group.cityId),
				eq(listings.contentHash, group.contentHash)
			),
			orderBy: [desc(listings.publishedAt), desc(listings.id)]
		});

		if (rows.length < 2) continue;

		const keeper = rows[0];
		const duplicates = rows.slice(1);

		const mergedImages = uniqImages(rows.flatMap((r) => (Array.isArray(r.images) ? r.images : [])));
		const bestContact = keeper.contact ?? rows.find((r) => r.contact)?.contact ?? null;
		const bestPrice = keeper.price ?? rows.find((r) => r.price !== null)?.price ?? null;
		const bestCurrency = keeper.currency ?? rows.find((r) => r.currency)?.currency ?? 'GEL';
		const bestCategoryId = keeper.categoryId ?? rows.find((r) => r.categoryId !== null)?.categoryId ?? 9;

		const keeperNeedsUpdate =
			JSON.stringify(Array.isArray(keeper.images) ? keeper.images : []) !==
				JSON.stringify(mergedImages) ||
			keeper.contact !== bestContact ||
			keeper.price !== bestPrice ||
			keeper.currency !== bestCurrency ||
			keeper.categoryId !== bestCategoryId;

		if (apply && keeperNeedsUpdate) {
			await db
				.update(listings)
				.set({ images: mergedImages, contact: bestContact, price: bestPrice, currency: bestCurrency, categoryId: bestCategoryId })
				.where(eq(listings.id, keeper.id));
			updatedKeepers++;
		}

		if (apply) {
			for (const d of duplicates) {
				await db.update(listings).set({ status: 'filtered' }).where(eq(listings.id, d.id));
				filteredRows++;
			}
		} else {
			filteredRows += duplicates.length;
		}
	}

	return { groups: groupsProcessed, filtered: filteredRows, updated: updatedKeepers };
}

// ─── Проход 2: нечёткие дубли по контакту + похожий заголовок ────────────

async function cleanupByContact(apply: boolean): Promise<{ groups: number; filtered: number }> {
	// Находим контакты с несколькими активными объявлениями в одном городе
	const contactGroups = (await db
		.select({
			cityId: listings.cityId,
			contact: listings.contact,
			count: sql<number>`count(*)::int`
		})
		.from(listings)
		.where(and(eq(listings.status, 'active'), isNotNull(listings.contact), ne(listings.contact, '')))
		.groupBy(listings.cityId, listings.contact)
		.having(sql`count(*) > 1`)
		.orderBy(asc(listings.cityId), asc(listings.contact))) as ContactGroup[];

	let groupsProcessed = 0;
	let filteredRows = 0;

	for (const cg of contactGroups) {
		const rows = await db.query.listings.findMany({
			where: and(
				eq(listings.status, 'active'),
				eq(listings.cityId, cg.cityId),
				eq(listings.contact, cg.contact)
			),
			orderBy: [desc(listings.publishedAt), desc(listings.id)],
			columns: { id: true, title: true, images: true, publishedAt: true }
		});

		if (rows.length < 2) continue;

		// Кластеризация: строим группы похожих объявлений (жадный O(n²), n мал)
		const visited = new Set<number>();
		const clusters: (typeof rows)[] = [];

		for (let i = 0; i < rows.length; i++) {
			if (visited.has(rows[i].id)) continue;
			const cluster = [rows[i]];
			visited.add(rows[i].id);
			const normI = normalizeListingContent(rows[i].title, null);
			for (let j = i + 1; j < rows.length; j++) {
				if (visited.has(rows[j].id)) continue;
				const normJ = normalizeListingContent(rows[j].title, null);
				if (wordJaccard(normI, normJ) >= TITLE_SIMILARITY_THRESHOLD) {
					cluster.push(rows[j]);
					visited.add(rows[j].id);
				}
			}
			clusters.push(cluster);
		}

		for (const cluster of clusters) {
			if (cluster.length < 2) continue;
			groupsProcessed++;

			// Keeper — самый новый (первый после сортировки по desc publishedAt)
			const keeper = cluster[0];
			const duplicates = cluster.slice(1);

			// Объединяем фото всех дублей в keeper
			if (apply) {
				const allImages = uniqImages(
					cluster.flatMap((r) => (Array.isArray(r.images) ? r.images : []))
				);
				const keeperImages = Array.isArray(keeper.images) ? keeper.images : [];
				if (JSON.stringify(allImages) !== JSON.stringify(keeperImages) && allImages.length > 0) {
					await db.update(listings).set({ images: allImages }).where(eq(listings.id, keeper.id));
				}

				for (const d of duplicates) {
					await db.update(listings).set({ status: 'filtered' }).where(eq(listings.id, d.id));
					filteredRows++;
				}
			} else {
				filteredRows += duplicates.length;
			}
		}
	}

	return { groups: groupsProcessed, filtered: filteredRows };
}

// ─── Проход 3: один город + та же цена + тот же первый URL фото (SQL) ─────
// Ловит перепосты с разным текстом, как один товар с разными формулировками.

type FirstImageGroupRow = {
	city_id: number;
	price: string;
	first_image: string;
	cnt: number;
};

async function cleanupByFirstImageAndPrice(apply: boolean): Promise<{ groups: number; filtered: number; updated: number }> {
	const raw = await db.execute(sql`
		SELECT
			l.city_id AS city_id,
			l.price::text AS price,
			(l.images #>> '{0}') AS first_image,
			count(*)::int AS cnt
		FROM listings l
		WHERE l.status = 'active'
			AND l.price IS NOT NULL
			AND coalesce(jsonb_array_length(l.images), 0) > 0
			AND nullif(trim(l.images #>> '{0}'), '') IS NOT NULL
			AND lower(coalesce(l.images #>> '{0}', '')) NOT LIKE '%placehold.co%'
		GROUP BY l.city_id, l.price, (l.images #>> '{0}')
		HAVING count(*) > 1
		ORDER BY count(*) DESC
		LIMIT 50000
	`);

	const groupRows = raw as unknown as FirstImageGroupRow[];

	let groupsProcessed = 0;
	let filteredRows = 0;
	let updatedKeepers = 0;

	for (const g of groupRows) {
		const rows = await db.query.listings.findMany({
			where: and(
				eq(listings.status, 'active'),
				eq(listings.cityId, g.city_id),
				sql`${listings.price} = ${g.price}::numeric`,
				sql`(${listings.images} #>> '{0}') = ${g.first_image}`
			),
			orderBy: [desc(listings.publishedAt), desc(listings.id)]
		});

		if (rows.length < 2) continue;
		groupsProcessed++;

		const keeper = rows[0];
		const duplicates = rows.slice(1);

		const mergedImages = uniqImages(rows.flatMap((r) => (Array.isArray(r.images) ? r.images : [])));
		const bestContact = keeper.contact ?? rows.find((r) => r.contact)?.contact ?? null;
		const bestPrice = keeper.price ?? rows.find((r) => r.price !== null)?.price ?? null;
		const bestCurrency = keeper.currency ?? rows.find((r) => r.currency)?.currency ?? 'GEL';
		const bestCategoryId = keeper.categoryId ?? rows.find((r) => r.categoryId !== null)?.categoryId ?? null;

		const keeperNeedsUpdate =
			JSON.stringify(Array.isArray(keeper.images) ? keeper.images : []) !== JSON.stringify(mergedImages) ||
			keeper.contact !== bestContact ||
			keeper.price !== bestPrice ||
			keeper.currency !== bestCurrency ||
			keeper.categoryId !== bestCategoryId;

		if (apply && keeperNeedsUpdate) {
			await db
				.update(listings)
				.set({
					images: mergedImages,
					contact: bestContact,
					price: bestPrice,
					currency: bestCurrency,
					categoryId: bestCategoryId
				})
				.where(eq(listings.id, keeper.id));
			updatedKeepers++;
		}

		if (apply) {
			for (const d of duplicates) {
				await db.update(listings).set({ status: 'filtered' }).where(eq(listings.id, d.id));
				filteredRows++;
			}
		} else {
			filteredRows += duplicates.length;
		}
	}

	return { groups: groupsProcessed, filtered: filteredRows, updated: updatedKeepers };
}

// ─── main ─────────────────────────────────────────────────────────────────

async function main() {
	const apply = process.env.APPLY === '1';

	console.log('--- Duplicate cleanup ---');
	console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
	console.log('');

	console.log('Pass 1: exact content hash duplicates...');
	const pass1 = await cleanupByContentHash(apply);
	console.log(`  Groups processed : ${pass1.groups}`);
	console.log(`  Rows filtered    : ${pass1.filtered}`);
	console.log(`  Keepers updated  : ${pass1.updated}`);

	console.log('Pass 2: contact + similar title duplicates...');
	const pass2 = await cleanupByContact(apply);
	console.log(`  Clusters found   : ${pass2.groups}`);
	console.log(`  Rows filtered    : ${pass2.filtered}`);

	console.log('Pass 3: same city + price + first image URL (SQL)...');
	const pass3 = await cleanupByFirstImageAndPrice(apply);
	console.log(`  Groups processed : ${pass3.groups}`);
	console.log(`  Rows filtered    : ${pass3.filtered}`);
	console.log(`  Keepers updated  : ${pass3.updated}`);

	console.log('');
	console.log(`Total filtered: ${pass1.filtered + pass2.filtered + pass3.filtered}`);

	process.exit(0);
}

main().catch((error) => {
	console.error('cleanup-duplicates failed:', error);
	process.exit(1);
});
