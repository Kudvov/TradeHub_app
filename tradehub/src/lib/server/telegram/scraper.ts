import * as cheerio from 'cheerio';
import { extractData } from './extractor';

export interface ScrapedMessage {
	id: number;
	text: string;
	html: string;
	images: string[];
	date: Date | null;
	author: string | null;
	extracted: ReturnType<typeof extractData>;
}

export async function scrapeMessage(groupHandle: string, messageId: number): Promise<ScrapedMessage | null> {
	try {
		const url = `https://t.me/${groupHandle}/${messageId}?embed=1`;
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
			}
		});

		if (!response.ok) return null;

		const html = await response.text();
		const $ = cheerio.load(html);

		// Если сообщение не найдено или удалено, блок с ошибкой
		if ($('.tgme_widget_message_error').length > 0) {
			return null;
		}

		// Текст
		const textDiv = $('.tgme_widget_message_text').first();
		// Заменяем <br> на переносы строк для корректного парсинга
		textDiv.find('br').replaceWith('\n');
		const text = textDiv.text().trim();

		if (!text) return null; // Нет текста, не объявление

		// Автор — берём username из ссылки автора сообщения (не название канала)
		// HTML: <a class="tgme_widget_message_author_name" href="https://t.me/username">
		const authorHref = $('.tgme_widget_message_author_name').attr('href') || '';
		const authorUsernameMatch = authorHref.match(/t\.me\/([a-zA-Z0-9_]+)/);
		const author = authorUsernameMatch ? authorUsernameMatch[1] : null;

		// Дата
		const dateAttr = $('.tgme_widget_message_date time').attr('datetime');
		const date = dateAttr ? new Date(dateAttr) : new Date();

		// Изображения (вытаскиваем background-image url)
		const images: string[] = [];
		$('.tgme_widget_message_photo_wrap').each((_, el) => {
			const style = $(el).attr('style');
			const match = style?.match(/background-image:url\('([^']+)'\)/);
			if (match && match[1]) {
				images.push(match[1]); // Прямая ссылка на cdn4.telesco.pe...
			}
		});

		return {
			id: messageId,
			text,
			html: textDiv.html() || '',
			images,
			date,
			author,
			extracted: extractData(text, author || undefined)
		};
	} catch (error) {
		console.error(`Ошибка скрапинга ${groupHandle}/${messageId}:`, error);
		return null;
	}
}
