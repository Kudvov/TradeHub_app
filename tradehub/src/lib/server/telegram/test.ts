import { scrapeMessage } from './scraper';

async function testFetch() {
	const groupHandle = 'BatumiTradeHub';
	const messageId = 8037;

	console.log(`\nПолучение сообщения t.me/${groupHandle}/${messageId}...`);

	try {
		const parsed = await scrapeMessage(groupHandle, messageId);
		if (parsed) {
			console.log('\n--- ОРИГИНАЛЬНЫЙ ТЕКСТ ---');
			console.log(parsed.text);

			console.log('\n--- РЕЗУЛЬТАТ ПАРСИНГА ---');
			console.log(JSON.stringify(parsed.extracted, null, 2));

			console.log('\nМедиа (прямые ссылки):', parsed.images);
            console.log('\nДата публикации:', parsed.date);
            console.log('Автор:', parsed.author);
		} else {
			console.log('Сообщение не найдено или скрыто.');
		}
	} catch (e: any) {
		console.error('Ошибка:', e.message);
	}

	process.exit(0);
}

testFetch();
