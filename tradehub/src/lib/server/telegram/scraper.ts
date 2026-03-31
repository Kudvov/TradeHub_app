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

const RESERVED_TG = new Set([
	'joinchat',
	'addstickers',
	'share',
	'proxy',
	'iv',
	'socks',
	'settings',
	'login'
]);

function pickAuthorUsername($: cheerio.CheerioAPI, groupHandle: string): string | null {
	const normalize = (value: string) =>
		value.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
	const group = normalize(groupHandle).toLowerCase();

	const valid = (u: string) => /^[a-zA-Z0-9_]{5,32}$/.test(u);

	/** Виджет часто отдаёт href="//t.me/username" без схемы */
	function absolutizeHref(href: string): string {
		const h = href.trim();
		if (h.startsWith('//') && /\/\/(t\.me|telegram\.me)(\/|$)/i.test(h)) {
			return `https:${h}`;
		}
		return h;
	}

	const usernameFromHref = (href: string): string | null => {
		const raw = absolutizeHref(href);
		if (!raw) return null;

		const tgResolve = raw.match(/tg:\/\/resolve\?domain=([a-zA-Z0-9_]+)/i);
		if (tgResolve?.[1]) {
			const u = tgResolve[1];
			if (!valid(u)) return null;
			if (u.toLowerCase() === group) return null;
			if (RESERVED_TG.has(u.toLowerCase())) return null;
			return u;
		}

		const m = raw.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
		const u = m?.[1];
		if (!u || !valid(u)) return null;
		if (u.toLowerCase() === group) return null;
		if (RESERVED_TG.has(u.toLowerCase())) return null;
		return u;
	};

	const trySelectors = [
		'a.tgme_widget_message_user[href*="t.me"]',
		'a.tgme_widget_message_user[href*="telegram.me"]',
		'.tgme_widget_message_user a[href*="t.me"]',
		'.tgme_widget_message_user a[href*="telegram.me"]',
		'.tgme_widget_message_forwarded_from a[href*="t.me"]',
		'.tgme_widget_message_forwarded_from a[href*="telegram.me"]',
		'.tgme_widget_message_forwarded_from_name a[href*="t.me"]',
		'.tgme_widget_message_author_name[href*="t.me"]',
		'.tgme_widget_message_author_name[href*="telegram.me"]',
		'.tgme_widget_message_author a[href*="t.me"]',
		'.tgme_widget_message_owner_name[href*="t.me"]',
		'.tgme_widget_message_from_author a[href*="t.me"]',
		'.tgme_widget_message_footer a[href*="t.me"]'
	];

	for (const sel of trySelectors) {
		const href = $(sel).first().attr('href') || '';
		const u = usernameFromHref(href);
		if (u) return u;
	}

	// Старые селекторы без href в атрибуте (иногда класс на <a>)
	for (const sel of [
		'.tgme_widget_message_author_name',
		'.tgme_widget_message_user',
		'.tgme_widget_message_forwarded_from_name a',
		'.tgme_widget_message_forwarded_from a'
	]) {
		const href = $(sel).first().attr('href') || '';
		const u = usernameFromHref(href);
		if (u) return u;
	}

	const $root = $('.tgme_widget_message').first();
	if ($root.length === 0) return null;

	const headerLinks: string[] = [];
	const textLinks: string[] = [];
	const pushUnique = (arr: string[], u: string) => {
		if (!arr.includes(u)) arr.push(u);
	};

	$root.find('a[href*="t.me"], a[href*="telegram.me"]').each((_, el) => {
		const href = $(el).attr('href') || '';
		const u = usernameFromHref(href);
		if (!u) return;
		const inBody = $(el).closest('.tgme_widget_message_text').length > 0;
		if (inBody) pushUnique(textLinks, u);
		else pushUnique(headerLinks, u);
	});

	if (headerLinks.length > 0) return headerLinks[0];
	if (textLinks.length > 0) return textLinks[0];

	return null;
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

		// Автор — пытаемся вытащить username из нескольких блоков виджета,
		// включая forwarded-автора и профиль по аватарке.
		const author = pickAuthorUsername($, groupHandle);

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
			extracted: extractData(text, author || undefined, groupHandle)
		};
	} catch (error) {
		console.error(`Ошибка скрапинга ${groupHandle}/${messageId}:`, error);
		return null;
	}
}
