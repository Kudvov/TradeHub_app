/** Основной список стоп-слов (подстроки в нормализованном тексте). Пока пусто — добавите новые позже. */
const STOP_WORDS_RAW: string[] = [];

/** Крипта, «лёгкий заработок» и похожий спам в объявлениях. */
const CRYPTO_AND_DRUGS: string[] = [
	'usdt',
	'usdc',
	'ustd',
	'usdt.',
	'u s d t',
	'тезер',
	'tether',
	'trc20',
	'trc-20',
	'erc20',
	'erc-20',
	'криптообмен',
	'обмен usdt',
	'продам usdt',
	'куплю usdt',
	'p2p обмен',
	'бинанс',
	'binance',
	'легкий заработок',
	'легкие деньги',
	'легкий доход',
	'быстрый заработок',
	'быстрые деньги',
	'пассивный доход',
	'пассивный заработок',
	'без вложений',
	'удаленный заработок',
	'удалённый заработок',
	'удаленная работа',
	'удалённая работа',
	'заработок в интернете',
	'заработок в сети',
	'заработок на дому',
	'заработок дома',
	'стабильный заработок',
	'дополнительный заработок',
	'подработка в интернете',
	'выплаты каждый день',
	'выплаты ежедневно',
	'от 100$ в день',
	'от 100 $ в день',
	'доход от 100',
	'криптовалютн', // криптовалютный / криптовалютная
	'стейкинг',
	'стейкингом'
];

function normalizeForMatch(input: string): string {
	return input
		.normalize('NFKC')
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/[\u200b-\u200d\ufeff]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const STOP_WORDS = [...new Set([...STOP_WORDS_RAW, ...CRYPTO_AND_DRUGS].map(normalizeForMatch))];

function stopWordsDisabled(): boolean {
	const v = process.env.TELEGRAM_STOP_WORDS_DISABLED?.trim().toLowerCase();
	return v === '1' || v === 'true' || v === 'yes';
}

export function findStopWord(text: string): string | null {
	if (stopWordsDisabled()) return null;
	const normalizedText = normalizeForMatch(text);
	for (const token of STOP_WORDS) {
		if (token && normalizedText.includes(token)) return token;
	}
	return null;
}

export function hasStopWords(text: string): boolean {
	return findStopWord(text) !== null;
}
