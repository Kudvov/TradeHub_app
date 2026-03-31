import { createHash } from 'node:crypto';

/**
 * Нормализация текста для сравнения дублей (одно объявление, разные message id).
 */
export function normalizeListingContent(title: string, description: string | null | undefined): string {
	const combined = `${title}\n${description ?? ''}`;
	return combined
		.toLowerCase()
		.replace(/\r\n/g, '\n')
		.replace(/\s+/g, ' ')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.trim();
}

export function listingContentFingerprint(title: string, description: string | null | undefined): string {
	const normalized = normalizeListingContent(title, description);
	return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
