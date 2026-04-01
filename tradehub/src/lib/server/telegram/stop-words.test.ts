import test from 'node:test';
import assert from 'node:assert/strict';
import { findStopWord, hasStopWords } from './stop-words';

test('matches user-provided obfuscated stop words', () => {
	assert.equal(hasStopWords('Πρедлᴀгᴀю отличную темку, пиши в dm'), true);
	assert.ok(findStopWord('На6σρ в ᴋσмандγ! Выплаты каждый день'));
});

test('matches crypto mentions', () => {
	assert.equal(hasStopWords('Куплю USDT, обмен в центре'), true);
	assert.equal(hasStopWords('Продажа за криптовалюту, binance p2p'), true);
});

test('matches drug-related mentions', () => {
	assert.equal(hasStopWords('ищу заклад, меф срочно'), true);
	assert.equal(hasStopWords('марихуана и гашиш'), true);
});

test('does not match normal marketplace listing', () => {
	assert.equal(
		hasStopWords('Продаю диван IKEA, 450 GEL, самовывоз из Батуми'),
		false
	);
});
