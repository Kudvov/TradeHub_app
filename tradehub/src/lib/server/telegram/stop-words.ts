const STOP_WORDS_RAW = [
	'Выплаты',
	'Подработка',
	'Зaнятость',
	'Заработать',
	'оплaта',
	'Вакансия',
	'Фарм',
	'Халтура',
	'xалтypу',
	'Бабла',
	'лутай',
	'прeмиями',
	'Работа',
	'Работы',
	'ρа6σтα',
	'зара6σтαй',
	'Зарaбатывай',
	'халтурочка',
	'cотpyдники',
	'вознаграждения',
	'Темка',
	'ℂρσчнσ',
	'πσᴍσщниᴋи',
	'ℂлσжны',
	'Зара6оток',
	'Шабашка',
	'халтуру',
	'Пᴩиʙеᴛствую',
	'Πρедлᴀгᴀю',
	'сᴏᴛρудничестʙо',
	'ᴩуб',
	'xaлтyрy',
	'На6σρ в ᴋσмандγ!',
	'∏одрσ6нeе',
	'Возραст',
	'дσ⨉σд',
	'ᴄта6ильный',
	'✗σчeшь',
	'зара6отать',
	'п0дзараб0тать',
	'заработок',
	'зарабатывай',
	'доход',
	'прибыль',
	'профит',
	'бабки',
	'деньги',
	'денюжки',
	'кэш',
	'cash',
	'выплaты',
	'оплата',
	'вознаграждение',
	'премия',
	'вакaнсия',
	'занятость',
	'шабашку',
	'шабашки',
	'халтурy',
	'набор',
	'на6σρ',
	'набор в команду',
	'сотрудники',
	'помощники',
	'партнёры',
	'партнерство',
	'сотрудничество',
	'срочно',
	'предлагаю',
	'подробнее',
	'dm',
	'личные сообщения'
];

const CRYPTO_AND_DRUGS = [
	'usdt',
	'крипт',
	'crypto',
	'криптовалют',
	'биткоин',
	'bitcoin',
	'ethereum',
	'эфир',
	'binance',
	'наркот',
	'заклад',
	'меф',
	'альфа-пвп',
	'амфетамин',
	'героин',
	'кокаин',
	'марихуан',
	'гашиш',
	'спайс'
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

export function findStopWord(text: string): string | null {
	const normalizedText = normalizeForMatch(text);
	for (const token of STOP_WORDS) {
		if (token && normalizedText.includes(token)) return token;
	}
	return null;
}

export function hasStopWords(text: string): boolean {
	return findStopWord(text) !== null;
}
