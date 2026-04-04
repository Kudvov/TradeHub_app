import { createHash } from 'node:crypto';

/**
 * Нормализация текста для сравнения дублей.
 *
 * Убираем всё «шумовое»:
 *  – URL-ссылки (http/https, t.me) — в разных группах могут различаться
 *  – форматирование телефонов (+7 555-12-34 ↔ 555 12 34 ↔ 5551234)
 *  – emoji и спецсимволы
 *  – пунктуацию (кроме пробелов)
 *  – лишние пробелы и невидимые символы
 */
export function normalizeListingContent(title: string, description: string | null | undefined): string {
	const combined = `${title}\n${description ?? ''}`;
	return combined
		.toLowerCase()
		.normalize('NFC')
		.replace(/\r\n/g, '\n')
		// невидимые символы и мягкий дефис
		.replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
		// URL
		.replace(/https?:\/\/\S+/gi, ' ')
		.replace(/t\.me\/\S+/gi, ' ')
		// форматирование телефонного номера: убираем разделители между цифрами
		// "+7 (555) 123-45-67" → "+75551234567", "555 12 34" → "5551234"
		.replace(/(\d)[ \t\-\.\(\)]+(?=\d)/g, '$1')
		// emoji (Emoji_Presentation + Extended_Pictographic — полный набор)
		.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
		// вся пунктуация и спецсимволы (оставляем буквы, цифры, пробелы)
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		// схлопываем пробелы
		.replace(/\s+/g, ' ')
		.trim();
}

export function listingContentFingerprint(title: string, description: string | null | undefined): string {
	const normalized = normalizeListingContent(title, description);
	return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

// ─── Нечёткое сравнение заголовков ────────────────────────────────────────

/**
 * Множество значимых слов нормализованной строки (длиннее 1 символа).
 */
function wordSet(normalized: string): Set<string> {
	return new Set(normalized.split(' ').filter((w) => w.length > 1));
}

/**
 * Коэффициент Жаккара по словам двух уже нормализованных строк.
 * 0 — полностью разные, 1 — идентичные.
 */
export function wordJaccard(normA: string, normB: string): number {
	const sa = wordSet(normA);
	const sb = wordSet(normB);
	if (sa.size === 0 && sb.size === 0) return 1;
	if (sa.size === 0 || sb.size === 0) return 0;
	let inter = 0;
	for (const w of sa) if (sb.has(w)) inter++;
	return inter / (sa.size + sb.size - inter);
}

/**
 * Порог схожести заголовков для признания дублем по контакту.
 * 0.65 — 2/3 слов совпадают, хорошо отлавливает перефразировку.
 */
export const TITLE_SIMILARITY_THRESHOLD = 0.65;

/**
 * Возвращает true, если два заголовка объявлений считаются одинаковыми
 * (нечёткое сравнение, нормализация применяется внутри).
 */
export function isSimilarTitle(titleA: string, titleB: string): boolean {
	const normA = normalizeListingContent(titleA, null);
	const normB = normalizeListingContent(titleB, null);
	return wordJaccard(normA, normB) >= TITLE_SIMILARITY_THRESHOLD;
}
