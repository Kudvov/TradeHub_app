/**
 * Переводит объявления на английский и грузинский через Google Gemini API.
 * - Берёт объявления где title_en IS NULL (ещё не переведены)
 * - Сохраняет title_en, description_en, title_ka, description_ka
 *
 * Запуск: npm run parser:translate
 * Dry run: DRY_RUN=1 npm run parser:translate
 *
 * Требуется GEMINI_API_KEY; модель — GEMINI_MODEL (по умолчанию gemini-2.5-flash).
 */

import { db } from '../db';
import { listings } from '../db/schema';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { resolveGeminiModel } from './gemini-model';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH_SIZE = 20;
const TRANSLATE_TIMEOUT_MS = 60_000;

interface TranslateResult {
	title_en: string;
	description_en: string | null;
	title_ka: string;
	description_ka: string | null;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
	const trimmed = raw.trim();
	const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return null;
	try {
		return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function normalizeTranslateResult(data: Record<string, unknown>): TranslateResult | null {
	const titleEn = typeof data.title_en === 'string' ? data.title_en.trim() : '';
	const titleKa = typeof data.title_ka === 'string' ? data.title_ka.trim() : '';
	if (!titleEn || !titleKa) return null;

	const descEn =
		data.description_en === null || data.description_en === undefined
			? null
			: typeof data.description_en === 'string'
				? data.description_en.trim() || null
				: null;
	const descKa =
		data.description_ka === null || data.description_ka === undefined
			? null
			: typeof data.description_ka === 'string'
				? data.description_ka.trim() || null
				: null;

	return {
		title_en: titleEn,
		description_en: descEn,
		title_ka: titleKa,
		description_ka: descKa
	};
}

async function translateListing(
	title: string,
	description: string | null,
	apiKey: string
): Promise<TranslateResult | null> {
	const payload = JSON.stringify({
		title,
		description: description ?? null
	});

	const prompt = `You translate classified ads for a marketplace in Georgia.

Input is a JSON object with keys "title" and "description" (description may be null).
Translate to English and Georgian. Preserve meaning; keep prices, phone numbers, and @usernames unchanged.

Respond with ONLY a JSON object and these exact keys:
title_en, description_en, title_ka, description_ka
Use null for description_en and description_ka when description was null or empty.

Input JSON:
${payload}`;

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolveGeminiModel()}:generateContent?key=${encodeURIComponent(apiKey)}`;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			signal: controller.signal,
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0.2,
					maxOutputTokens: 2048,
					responseMimeType: 'application/json'
				}
			})
		});

		if (!res.ok) return null;

		const body = (await res.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[];
		};
		const raw = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
		if (!raw) return null;

		const parsed = parseJsonObject(raw);
		if (!parsed) return null;
		return normalizeTranslateResult(parsed);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function main() {
	const DRY_RUN = process.env.DRY_RUN === '1';
	const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';

	console.log(
		`🌍 Перевод объявлений через Gemini (${resolveGeminiModel()})${DRY_RUN ? ' (DRY RUN — изменений нет)' : ''}...`
	);
	console.log('Символы: .=переведено  ?=ошибка API\n');

	if (!apiKey) {
		console.error('❌ GEMINI_API_KEY не задан в .env');
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

			const result = await translateListing(listing.title, listing.description ?? null, apiKey);

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
