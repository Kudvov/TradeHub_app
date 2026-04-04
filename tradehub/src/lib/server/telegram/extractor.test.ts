import test from 'node:test';
import assert from 'node:assert/strict';
import { extractData } from './extractor';

test('extracts direct t.me link from text', () => {
	const text = 'Пишите в личку: t.me/Cheburashkaaye';
	const result = extractData(text, undefined);
	assert.equal(result.contact, 't.me/Cheburashkaaye');
});

test('extracts https t.me link from text', () => {
	const text = 'Контакт: https://t.me/Cheburashkaaye';
	const result = extractData(text, undefined);
	assert.equal(result.contact, 't.me/Cheburashkaaye');
});

test('falls back to message author username as t.me link', () => {
	const result = extractData('Без контакта в тексте', 'Cheburashkaaye');
	assert.equal(result.contact, 't.me/Cheburashkaaye');
});

test('prefers message author over text contacts', () => {
	const text = 'Пишите: t.me/AnotherSeller или +995599123456';
	const result = extractData(text, 'Cheburashkaaye');
	assert.equal(result.contact, 't.me/Cheburashkaaye');
});

test('filters group handle from text links', () => {
	const text = 'Группа t.me/BatumiHub пишите t.me/seller_name_here';
	const result = extractData(text, undefined, 'BatumiHub');
	assert.equal(result.contact, 't.me/seller_name_here');
});

test('extracts price with лар (GEL)', () => {
	const text = 'Флеш карта SD 32 Gb - 25 лар';
	const result = extractData(text, undefined);
	assert.equal(result.price, '25');
	assert.equal(result.currency, 'GEL');
});

test('extracts price with лари before number', () => {
	const text = 'Продам стол лари 80';
	const result = extractData(text, undefined);
	assert.equal(result.price, '80');
	assert.equal(result.currency, 'GEL');
});
