/**
 * Переводит объявления на английский и грузинский через Claude Haiku (Anthropic API).
 * - Берёт объявления где title_en IS NULL (ещё не переведены)
 * - Сохраняет title_en, description_en, title_ka, description_ka
 *
 * Запуск: npm run parser:translate
 * Dry run: DRY_RUN=1 npm run parser:translate
 */

import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';
import { listings } from '../db/schema';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH_SIZE = 20;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TranslateResult {
	title_en: string;
	description_en: string | null;
	title_ka: string;
	description_ka: string | null;
}

async function translateListing(
	title: string,
	description: string | null
): Promise<TranslateResult | null> {
	const text = description ? `Title: ${title}\nDescription: ${description}` : `Title: ${title}`;

	try {
		const message = await client.messages.create({
			model: 'claude-haiku-4-5',
			max_tokens: 2048,
			messages: [
				{
					role: 'user',
					content: `Translate the following classified ad to English and Georgian.
Respond strictly as JSON with keys: title_en, description_en, title_ka, description_ka.
If there is no description, use null for description fields.
Do not add any explanation, only JSON.

${text}`
				}
			]
		});

		const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : null;
		if (!raw) return null;

		// Вырезаем JSON из ответа (на случай если модель добавит ```json ... ```)
		const jsonMatch = raw.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return null;

		return JSON.parse(jsonMatch[0]) as TranslateResult;
	} catch {
		return null;
	}
}

async function main() {
	const DRY_RUN = process.env.DRY_RUN === '1';
	console.log(`🌍 Перевод объявлений через Claude Haiku${DRY_RUN ? ' (DRY RUN — изменений нет)' : ''}...`);
	console.log('Символы: .=переведено  ?=ошибка API\n');

	if (!process.env.ANTHROPIC_API_KEY) {
		console.error('❌ ANTHROPIC_API_KEY не задан в .env');
		process.exit(1);
	}

	let lastId = 0;
	let translated = 0;
	let errors = 0;

	while (true) {
		const batch = await db.query.listings.findMany({
			where: and(eq(listings.status, 'active'), isNull(listings.titleEn), gt(listings.id, lastId)),
			orderBy: [asc(listings.id)],
			limit: BATCH_SIZE,
			columns: { id: true, title: true, description: true }
		});

		if (batch.length === 0) break;

		for (const listing of batch) {
			lastId = listing.id;

			const result = await translateListing(listing.title, listing.description ?? null);

			if (!result) {
				errors++;
				process.stdout.write('?');
				continue;
			}

			if (!DRY_RUN) {
				await db
					.update(listings)
					.set({
						titleEn: result.title_en,
						descriptionEn: result.description_en,
						titleKa: result.title_ka,
						descriptionKa: result.description_ka
					})
					.where(eq(listings.id, listing.id));
			}

			translated++;
			process.stdout.write('.');
		}
	}

	console.log('\n\n✅ Готово');
	console.log(`Переведено:    ${translated}`);
	console.log(`Ошибки API:    ${errors}`);
	process.exit(0);
}

main().catch((e) => {
	console.error('❌ Ошибка:', e);
	process.exit(1);
});
