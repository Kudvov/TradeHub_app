import Typograf from 'typograf';

let instance: Typograf | null = null;

function getTypograf(): Typograf {
	if (!instance) {
		const tp = new Typograf({
			locale: ['ru', 'en-US'],
			htmlEntity: { type: 'default' }
		});
		tp.addSafeTag(/https?:\/\/[^\s<>[\]()]+/gi);
		tp.addSafeTag(/t\.me\/[^\s<>[\]()]+/gi);
		tp.addSafeTag(/@[a-zA-Z][a-zA-Z0-9_]{3,31}/g);
		instance = tp;
	}
	return instance;
}

function typografDisabled(): boolean {
	const v = process.env.TELEGRAM_TYPOGRAF_DISABLED?.trim().toLowerCase();
	return v === '1' || v === 'true' || v === 'yes';
}

/** Плоский текст объявления: кавычки, тире, неразрывные пробелы (UTF-8, без HTML-сущностей). */
export function typografPlainText(text: string): string {
	if (!text || typografDisabled()) return text;
	return getTypograf().execute(text);
}

export type ListingExtractedText = {
	title: string;
	description: string | null;
};

/** Мутирует title/description у результата экстрактора перед хешем и записью в БД. */
export function applyTypografToExtracted(extracted: ListingExtractedText): void {
	if (typografDisabled()) return;
	extracted.title = typografPlainText(extracted.title);
	if (extracted.description != null && extracted.description !== '') {
		extracted.description = typografPlainText(extracted.description);
	}
}
