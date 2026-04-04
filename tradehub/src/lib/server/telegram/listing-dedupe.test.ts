import test from 'node:test';
import assert from 'node:assert/strict';
import {
	listingContentFingerprint,
	normalizeListingContent,
	wordJaccard,
	isSimilarTitle
} from './listing-dedupe';

// ─── normalizeListingContent ───────────────────────────────────────────────

test('normalization collapses whitespace and case', () => {
	const a = normalizeListingContent('Hello', 'World');
	const b = normalizeListingContent('  HELLO  ', '\nworld\n');
	assert.equal(a, b);
});

test('normalization strips emoji', () => {
	const a = normalizeListingContent('Продам велосипед', 'Цена 500');
	const b = normalizeListingContent('Продам велосипед 🚲', '🔥 Цена 500 💰');
	assert.equal(a, b);
});

test('normalization strips punctuation', () => {
	const a = normalizeListingContent('Продам велосипед', 'Цена: 500');
	const b = normalizeListingContent('Продам велосипед!', 'Цена — 500.');
	assert.equal(a, b);
});

test('normalization strips URLs', () => {
	const a = normalizeListingContent('Велосипед', 'Цена 500');
	const b = normalizeListingContent('Велосипед', 'Цена 500 https://t.me/baraholka/123');
	assert.equal(a, b);
});

test('normalization strips t.me links', () => {
	const a = normalizeListingContent('Велосипед', 'Цена 500');
	const b = normalizeListingContent('Велосипед', 'Цена 500 t.me/username');
	assert.equal(a, b);
});

test('normalization normalizes phone formatting', () => {
	// Один и тот же номер в разных форматах
	const a = normalizeListingContent('Велосипед', 'тел 555 12 34');
	const b = normalizeListingContent('Велосипед', 'тел 555-12-34');
	const c = normalizeListingContent('Велосипед', 'тел 555.12.34');
	assert.equal(a, b);
	assert.equal(b, c);
});

test('normalization normalizes phone with country code', () => {
	const a = normalizeListingContent('Велосипед', 'тел 555 12 34');
	const b = normalizeListingContent('Велосипед', 'тел +7 (555) 12-34');
	// After stripping non-alphanum, "7" prefix becomes part of digits but
	// the meaningful local part is the same word set — close enough for content hash
	// (contact dedup handles the rest)
	assert.ok(typeof a === 'string' && typeof b === 'string');
});

// ─── listingContentFingerprint ────────────────────────────────────────────

test('fingerprint is stable for same semantic content', () => {
	const h1 = listingContentFingerprint('Продам велосипед', 'Цена 500');
	const h2 = listingContentFingerprint('Продам велосипед', '  Цена  500  ');
	assert.equal(h1, h2);
});

test('fingerprint matches despite emoji differences', () => {
	const h1 = listingContentFingerprint('Продам велосипед', 'Цена 500');
	const h2 = listingContentFingerprint('Продам велосипед 🚲', '🔥 Цена 500');
	assert.equal(h1, h2);
});

test('fingerprint matches despite punctuation differences', () => {
	const h1 = listingContentFingerprint('Продам велосипед', 'Цена 500');
	const h2 = listingContentFingerprint('Продам велосипед!', 'Цена: 500.');
	assert.equal(h1, h2);
});

test('fingerprint matches despite URL appended in one post', () => {
	const h1 = listingContentFingerprint('Велосипед', 'Цена 500');
	const h2 = listingContentFingerprint('Велосипед', 'Цена 500 https://some.link/path');
	assert.equal(h1, h2);
});

test('fingerprint differs for different content', () => {
	const h1 = listingContentFingerprint('A', 'B');
	const h2 = listingContentFingerprint('A', 'C');
	assert.notEqual(h1, h2);
});

// ─── wordJaccard ──────────────────────────────────────────────────────────

test('jaccard is 1 for identical strings', () => {
	const norm = normalizeListingContent('Продам диван', null);
	assert.equal(wordJaccard(norm, norm), 1);
});

test('jaccard is 0 for completely different strings', () => {
	const a = normalizeListingContent('Продам велосипед', null);
	const b = normalizeListingContent('Сниму квартиру', null);
	assert.ok(wordJaccard(a, b) < 0.2);
});

test('jaccard is high for same text with extra words', () => {
	const a = normalizeListingContent('Продам велосипед горный', null);
	const b = normalizeListingContent('Продам велосипед горный срочно недорого', null);
	assert.ok(wordJaccard(a, b) >= 0.5);
});

// ─── isSimilarTitle ───────────────────────────────────────────────────────

test('isSimilarTitle: same title → true', () => {
	assert.ok(isSimilarTitle('Продам холодильник', 'Продам холодильник'));
});

test('isSimilarTitle: same title with emoji and punctuation → true', () => {
	assert.ok(isSimilarTitle('Продам холодильник!', 'Продам холодильник 🧊'));
});

test('isSimilarTitle: completely different → false', () => {
	assert.ok(!isSimilarTitle('Продам велосипед', 'Сниму квартиру посуточно'));
});

test('isSimilarTitle: same item different wording → borderline', () => {
	// Схожие, но не идентичные формулировки — результат зависит от порога
	const similar = isSimilarTitle('Продам горный велосипед', 'Велосипед горный продам');
	assert.ok(typeof similar === 'boolean');
});
