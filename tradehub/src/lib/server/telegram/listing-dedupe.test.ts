import test from 'node:test';
import assert from 'node:assert/strict';
import { listingContentFingerprint, normalizeListingContent } from './listing-dedupe';

test('normalization collapses whitespace and case', () => {
	const a = normalizeListingContent('Hello', 'World');
	const b = normalizeListingContent('  HELLO  ', '\nworld\n');
	assert.equal(a, b);
});

test('fingerprint is stable for same semantic content', () => {
	const h1 = listingContentFingerprint('Продам велосипед', 'Цена 500');
	const h2 = listingContentFingerprint('Продам велосипед', '  Цена  500  ');
	assert.equal(h1, h2);
});

test('fingerprint differs for different content', () => {
	const h1 = listingContentFingerprint('A', 'B');
	const h2 = listingContentFingerprint('A', 'C');
	assert.notEqual(h1, h2);
});
