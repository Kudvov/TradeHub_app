import test from 'node:test';
import assert from 'node:assert/strict';
import { getContactHref, isPhoneContact } from './contact';

test('detects phone contacts', () => {
	assert.equal(isPhoneContact('+995 599 12 34 56'), true);
	assert.equal(isPhoneContact('599123456'), true);
	assert.equal(isPhoneContact('@seller_name'), false);
});

test('builds tel link for phone numbers', () => {
	assert.equal(getContactHref('+995 599 12 34 56'), 'tel:+995599123456');
});

test('keeps full https t.me links as is', () => {
	assert.equal(getContactHref('https://t.me/seller_name'), 'https://t.me/seller_name');
});

test('keeps full http links as is', () => {
	assert.equal(getContactHref('http://example.com/contact'), 'http://example.com/contact');
});

test('normalizes short t.me links', () => {
	assert.equal(getContactHref('t.me/seller_name'), 'https://t.me/seller_name');
});

test('normalizes @username to t.me link', () => {
	assert.equal(getContactHref('@seller_name'), 'https://t.me/seller_name');
});

test('trims surrounding whitespace', () => {
	assert.equal(getContactHref('   @seller_name   '), 'https://t.me/seller_name');
});

test('returns safe fallback for empty contact', () => {
	assert.equal(getContactHref('   '), '#');
});

test('returns safe fallback for invalid short telegram username', () => {
	assert.equal(getContactHref('@ab'), '#');
	assert.equal(getContactHref('t.me/ab'), '#');
});
