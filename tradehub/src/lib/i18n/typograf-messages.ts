import Typograf from 'typograf';

/** Не трогать подстановки svelte-i18n вида `{city}`, `{count}`. */
const PLACEHOLDER_SAFE = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

let ruEn: Typograf | null = null;
let enOnly: Typograf | null = null;

function typografRu(): Typograf {
	if (!ruEn) {
		const tp = new Typograf({
			locale: ['ru', 'en-US'],
			htmlEntity: { type: 'default' }
		});
		tp.addSafeTag(PLACEHOLDER_SAFE);
		ruEn = tp;
	}
	return ruEn;
}

function typografEn(): Typograf {
	if (!enOnly) {
		const tp = new Typograf({
			locale: ['en-US'],
			htmlEntity: { type: 'default' }
		});
		tp.addSafeTag(PLACEHOLDER_SAFE);
		enOnly = tp;
	}
	return enOnly;
}

export function typografUiString(locale: string, text: string): string {
	if (!text || locale === 'ka') return text;
	try {
		if (locale === 'ru') return typografRu().execute(text);
		if (locale === 'en') return typografEn().execute(text);
	} catch {
		return text;
	}
	return text;
}

export function typografMessages(
	locale: string,
	messages: Record<string, string>
): Record<string, string> {
	if (locale === 'ka') return { ...messages };
	const out: Record<string, string> = {};
	for (const key of Object.keys(messages)) {
		const v = messages[key];
		out[key] = typeof v === 'string' ? typografUiString(locale, v) : v;
	}
	return out;
}
