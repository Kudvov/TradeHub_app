import * as cheerio from 'cheerio';
import { ProxyAgent } from 'undici';
import { extractData, type ExtractedData } from './extractor';
import { findStopWord } from './stop-words';
import { classifyListing } from './classifier';

export interface ScrapedMessage {
	id: number;
	text: string;
	html: string;
	images: string[];
	date: Date | null;
	author: string | null;
	extracted: ExtractedData;
}

const FETCH_TIMEOUT_MS = Number(process.env.PARSER_FETCH_TIMEOUT_MS ?? 12000);
const FETCH_RETRIES = Number(process.env.PARSER_FETCH_RETRIES ?? 3);
const FETCH_RETRY_BASE_MS = Number(process.env.PARSER_FETCH_RETRY_BASE_MS ?? 700);

/** HTTP(S) прокси для запросов к t.me: PARSER_HTTPS_PROXY приоритетнее HTTPS_PROXY / https_proxy */
function createParserProxyAgent(): ProxyAgent | undefined {
	const raw =
		process.env.PARSER_HTTPS_PROXY?.trim() ||
		process.env.HTTPS_PROXY?.trim() ||
		process.env.https_proxy?.trim();
	if (!raw) return undefined;
	try {
		return new ProxyAgent(raw);
	} catch (e) {
		console.error('[scraper] Некорректный URL прокси (PARSER_HTTPS_PROXY / HTTPS_PROXY):', e);
		return undefined;
	}
}

const parserProxyAgent = createParserProxyAgent();
if (parserProxyAgent) {
	console.log('[scraper] Запросы к t.me идут через HTTP(S) прокси (PARSER_HTTPS_PROXY / HTTPS_PROXY)');
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

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function absolutizeTelegramAssetUrl(raw: string): string {
	const value = raw.trim();
	if (!value) return '';
	if (value.startsWith('//')) return `https:${value}`;
	if (value.startsWith('/')) return `https://t.me${value}`;
	return value;
}

function pickBestFromSrcset(srcset: string): string {
	const candidates = srcset
		.split(',')
		.map((item) => item.trim().split(/\s+/)[0] ?? '')
		.filter(Boolean);
	if (candidates.length === 0) return '';
	return candidates[candidates.length - 1];
}

async function fetchWithRetry(url: string): Promise<Response | null> {
	for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const init: RequestInit & { dispatcher?: ProxyAgent } = {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
				},
				signal: controller.signal
			};
			if (parserProxyAgent) init.dispatcher = parserProxyAgent;

			const response = await fetch(url, init);
			clearTimeout(timeout);

			// Явный "не найдено" не ретраим.
			if (response.status === 404) return response;
			if (response.ok) return response;

			// Для 429/5xx пробуем ещё раз.
			if (response.status === 429 || response.status >= 500) {
				if (attempt < FETCH_RETRIES) {
					await sleep(FETCH_RETRY_BASE_MS * attempt);
					continue;
				}
			}
			return response;
		} catch {
			clearTimeout(timeout);
			if (attempt < FETCH_RETRIES) {
				await sleep(FETCH_RETRY_BASE_MS * attempt);
				continue;
			}
			return null;
		}
	}
	return null;
}

const IMAGE_PROBE_TIMEOUT_MS = Math.min(FETCH_TIMEOUT_MS, 12_000);

/**
 * Проверка, отдаёт ли URL контент (CDN фото Telegram и т.п.).
 * Сначала HEAD, при неуспехе (кроме 404/410) — GET с Range.
 * Использует тот же прокси, что и парсер t.me.
 */
export async function probeHttpUrlOk(url: string): Promise<boolean> {
	async function once(method: 'HEAD' | 'GET', rangeBytes?: string): Promise<Response | null> {
		for (let att = 1; att <= FETCH_RETRIES; att++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), IMAGE_PROBE_TIMEOUT_MS);
			try {
				const headers: Record<string, string> = {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: '*/*'
				};
				if (rangeBytes) headers.Range = rangeBytes;
				const init: RequestInit & { dispatcher?: ProxyAgent } = {
					method,
					headers,
					signal: controller.signal
				};
				if (parserProxyAgent) init.dispatcher = parserProxyAgent;

				const response = await fetch(url, init);
				clearTimeout(timeout);

				if (response.ok || response.status === 206) return response;
				if (response.status === 404 || response.status === 410) return response;
				if (response.status === 429 || response.status >= 500) {
					if (att < FETCH_RETRIES) {
						await sleep(FETCH_RETRY_BASE_MS * att);
						continue;
					}
				}
				return response;
			} catch {
				clearTimeout(timeout);
				if (att < FETCH_RETRIES) {
					await sleep(FETCH_RETRY_BASE_MS * att);
					continue;
				}
				return null;
			}
		}
		return null;
	}

	const head = await once('HEAD');
	if (head && (head.ok || head.status === 206)) return true;
	if (head && (head.status === 404 || head.status === 410)) return false;

	const getRes = await once('GET', 'bytes=0-0');
	return !!(getRes && (getRes.ok || getRes.status === 206));
}

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

/** missing — нет поста / удалён; non_listing — пост есть, но без текста (фото, сервис); listing — есть текст */
export type ScrapeOutcome =
	| { kind: 'missing' }
	| { kind: 'non_listing' }
	| { kind: 'listing'; data: ScrapedMessage };

export async function scrapeMessageWithKind(
	groupHandle: string,
	messageId: number
): Promise<ScrapeOutcome> {
	try {
		const url = `https://t.me/${groupHandle}/${messageId}?embed=1`;
		const response = await fetchWithRetry(url);

		if (!response || !response.ok) return { kind: 'missing' };

		const html = await response.text();
		const $ = cheerio.load(html);

		if ($('.tgme_widget_message_error').length > 0) {
			return { kind: 'missing' };
		}

		const $msg = $('.tgme_widget_message').first();
		if ($msg.length === 0) {
			return { kind: 'missing' };
		}

		const textDiv = $('.tgme_widget_message_text').first();
		textDiv.find('br').replaceWith('\n');
		const text = textDiv.text().trim();

		if (!text) {
			// Пост на месте, но под объявление не годится — не считаем «дырой» в нумерации
			return { kind: 'non_listing' };
		}

		// Отсекаем спам/запрещённые тематики до вставки в БД.
		if (findStopWord(text)) {
			return { kind: 'non_listing' };
		}

		// AI-классификация: фильтр не-объявлений + определение категории
		const classified = await classifyListing(text);
		if (!classified.isListing) {
			return { kind: 'non_listing' };
		}

		const author = pickAuthorUsername($, groupHandle);
		const dateAttr = $('.tgme_widget_message_date time').attr('datetime');
		const date = dateAttr ? new Date(dateAttr) : new Date();

		const images: string[] = [];
		const pushImage = (candidate: string | undefined) => {
			if (!candidate) return;
			const value = absolutizeTelegramAssetUrl(candidate);
			if (!value) return;
			if (!images.includes(value)) images.push(value);
		};

		$('.tgme_widget_message_photo_wrap').each((_, el) => {
			const style = $(el).attr('style');
			const match = style?.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
			if (match?.[2]) pushImage(match[2]);

			const src = $(el).attr('src');
			if (src) pushImage(src);

			const srcset = $(el).attr('srcset');
			if (srcset) pushImage(pickBestFromSrcset(srcset));
		});

		$('.tgme_widget_message_photo img').each((_, el) => {
			const src = $(el).attr('src');
			if (src) pushImage(src);
			const srcset = $(el).attr('srcset');
			if (srcset) pushImage(pickBestFromSrcset(srcset));
		});

		return {
			kind: 'listing',
			data: {
				id: messageId,
				text,
				html: textDiv.html() || '',
				images,
				date,
				author,
				extracted: await extractData(text, author || undefined, groupHandle, classified.categorySlug)
			}
		};
	} catch (error) {
		console.error(`Ошибка скрапинга ${groupHandle}/${messageId}:`, error);
		return { kind: 'missing' };
	}
}

export async function scrapeMessage(groupHandle: string, messageId: number): Promise<ScrapedMessage | null> {
	const r = await scrapeMessageWithKind(groupHandle, messageId);
	return r.kind === 'listing' ? r.data : null;
}
