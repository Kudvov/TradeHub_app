/** Имя модели Gemini для REST API (classifier, extractor, translate). */
export function resolveGeminiModel(): string {
	const m = process.env.GEMINI_MODEL?.trim();
	if (m && /^[a-zA-Z0-9_.-]+$/.test(m)) return m;
	return 'gemini-2.5-flash';
}
