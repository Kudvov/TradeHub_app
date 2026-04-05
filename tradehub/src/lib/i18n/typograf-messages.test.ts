import test from 'node:test';
import assert from 'node:assert/strict';
import { typografMessages, typografUiString } from './typograf-messages';

test('typograf UI: preserves i18n placeholders', () => {
	const s = typografUiString('ru', 'Поиск в {city}...');
	assert.ok(s.includes('{city}'));
});

test('typograf UI: ka locale unchanged', () => {
	const raw = { a: 'ტესტი "ციტატა"' };
	const out = typografMessages('ka', raw);
	assert.deepEqual(out, raw);
});
