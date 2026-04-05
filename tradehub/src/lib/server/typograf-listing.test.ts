import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTypografToExtracted, typografPlainText } from './typograf-listing';

test('typograf: russian quotes and @username preserved', () => {
	const original = process.env.TELEGRAM_TYPOGRAF_DISABLED;
	delete process.env.TELEGRAM_TYPOGRAF_DISABLED;
	try {
		const out = typografPlainText('Продам "диван" — пиши @seller_name');
		assert.match(out, /@seller_name/);
		assert.ok(out.includes('«') && out.includes('»'));
	} finally {
		if (original !== undefined) process.env.TELEGRAM_TYPOGRAF_DISABLED = original;
	}
});

test('typograf: disabled via env leaves text unchanged', () => {
	process.env.TELEGRAM_TYPOGRAF_DISABLED = '1';
	try {
		const s = 'Продам "диван" — дёшево';
		assert.equal(typografPlainText(s), s);
		const ex = { title: s, description: null };
		applyTypografToExtracted(ex);
		assert.equal(ex.title, s);
	} finally {
		delete process.env.TELEGRAM_TYPOGRAF_DISABLED;
	}
});
