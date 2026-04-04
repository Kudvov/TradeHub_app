import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cities, categories, telegramGroups } from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
	console.log('🌱 Seeding database...');

	// ── Cities ──
	const insertedCities = await db
		.insert(cities)
		.values([
			{ name: 'Тбилиси', slug: 'tbilisi', country: 'GE', listingsCount: 0 },
			{ name: 'Батуми', slug: 'batumi', country: 'GE', listingsCount: 0 },
			{ name: 'Кутаиси', slug: 'kutaisi', country: 'GE', listingsCount: 0 },
			{ name: 'Рустави', slug: 'rustavi', country: 'GE', listingsCount: 0 },
			{ name: 'Зугдиди', slug: 'zugdidi', country: 'GE', listingsCount: 0 }
		])
		.onConflictDoNothing()
		.returning();
	console.log(`  ✅ Cities: ${insertedCities.length} inserted`);

	// ── Categories ──
	const insertedCategories = await db
		.insert(categories)
		.values([
			{ name: 'Электроника', slug: 'electronics', icon: '📱', sortOrder: 1 },
			{ name: 'Одежда', slug: 'clothing', icon: '👕', sortOrder: 2 },
			{ name: 'Авто', slug: 'auto', icon: '🚗', sortOrder: 3 },
			{ name: 'Мебель', slug: 'furniture', icon: '🛋️', sortOrder: 4 },
			{ name: 'Недвижимость', slug: 'realestate', icon: '🏠', sortOrder: 5 },
			{ name: 'Услуги', slug: 'services', icon: '🔧', sortOrder: 6 },
			{ name: 'Детские товары', slug: 'kids', icon: '🧸', sortOrder: 7 },
			{ name: 'Спорт', slug: 'sport', icon: '⚽', sortOrder: 8 },
			{ name: 'Другое', slug: 'other', icon: '📦', sortOrder: 99 }
		])
		.onConflictDoNothing()
		.returning();
	console.log(`  ✅ Categories: ${insertedCategories.length} inserted`);

	// ── Telegram Groups ──
	const batumiId = insertedCities.find((c) => c.slug === 'batumi')?.id ?? 2;
	const tbilisiId = insertedCities.find((c) => c.slug === 'tbilisi')?.id ?? 1;

	const insertedGroups = await db
		.insert(telegramGroups)
		.values([
			// Премиум-группы: lastMessageId=1 + startMessageId=0 → первый прогон sync.ts.
			{
				title: 'Batumi Trade Hub',
				username: 'BatumiTradeHub',
				cityId: batumiId,
				lastMessageId: 1,
				startMessageId: 0
			},
			{
				title: 'Tbilisi Trade Hub',
				username: 'TbilisiTradeHub',
				cityId: tbilisiId,
				lastMessageId: 1,
				startMessageId: 0
			},
			{
				title: 'Batumi helps',
				username: 'Batumi_helps',
				cityId: batumiId,
				lastMessageId: 2301897,
				startMessageId: 2301897
			}
		])
		.onConflictDoNothing()
		.returning();
	console.log(`  ✅ Telegram Groups: ${insertedGroups.length} inserted`);

	// Объявления не добавляются через seed — данные приходят от реального парсера Telegram.
	// Запустите: npm run parser:sync

	console.log('🎉 Seed complete! Run "npm run parser:sync" to populate listings.');
	process.exit(0);
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
