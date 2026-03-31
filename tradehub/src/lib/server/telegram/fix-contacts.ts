/**
 * Скрипт для исправления контактов у объявлений, где contact = название канала.
 * Перепарсит только эти записи и обновит поле contact.
 */
import { scrapeMessage } from './scraper';
import { db } from '../db';
import { listings, telegramGroups } from '../db/schema';
import { eq, or, like } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
	console.log('🔧 Исправление контактов...');

	// Находим записи с именем канала вместо контакта
	const badListings = await db.query.listings.findMany({
		where: or(
			like(listings.contact, '%Батуми%'),
			like(listings.contact, '%Барахолка%'),
			like(listings.contact, '%Тбилиси%')
		),
		with: { telegramGroup: true }
	});

	console.log(`Найдено записей для исправления: ${badListings.length}`);

	let fixed = 0;
	let noContact = 0;

	for (const listing of badListings) {
		if (!listing.telegramMessageId || !listing.telegramGroup?.username) continue;

		const handle = listing.telegramGroup.username.replace('@', '').replace('https://t.me/', '');
		const msgId = Number(listing.telegramMessageId);

		try {
			await new Promise((r) => setTimeout(r, 600));
			const parsed = await scrapeMessage(handle, msgId);

			if (!parsed) {
				process.stdout.write('x');
				continue;
			}

			const newContact = parsed.extracted.contact;

			await db
				.update(listings)
				.set({ contact: newContact })
				.where(eq(listings.id, listing.id));

			if (newContact) {
				fixed++;
				process.stdout.write('+');
			} else {
				noContact++;
				process.stdout.write('0');
			}
		} catch (err: any) {
			console.error(`\n❌ Ошибка для ID ${listing.id}:`, err.message);
		}
	}

	console.log(`\n✅ Исправлено: ${fixed}, без контакта: ${noContact}`);
	process.exit(0);
}

main();
