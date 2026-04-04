import test from 'node:test';
import assert from 'node:assert/strict';
import { findStopWord, hasStopWords } from './stop-words';

test('homoglyph spam without matching tokens is not filtered', () => {
	assert.equal(hasStopWords('Πρедлᴀгᴀю отличную темку, пиши в dm'), false);
});

test('easy-money phrases are filtered', () => {
	assert.equal(findStopWord('На6σρ в ᴋσмандγ! Выплаты каждый день'), 'выплаты каждый день');
	assert.equal(hasStopWords('Легкий заработок без вложений, пиши в лс'), true);
	assert.equal(hasStopWords('Удалённый заработок в интернете'), true);
});

test('crypto-related phrases are filtered', () => {
	assert.equal(hasStopWords('Куплю USDT, обмен в центре'), true);
	assert.equal(findStopWord('продам тезер trc20'), 'тезер');
	assert.equal(hasStopWords('P2P обмен binance'), true);
});

test('drug-related text is not in this list', () => {
	assert.equal(hasStopWords('ищу заклад, меф срочно'), false);
});

test('does not match normal marketplace listing', () => {
	assert.equal(
		hasStopWords('Продаю диван IKEA, 450 GEL, самовывоз из Батуми'),
		false
	);
});
