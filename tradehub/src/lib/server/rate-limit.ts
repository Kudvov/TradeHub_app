/**
 * In-memory sliding window rate limiter.
 * Подходит для single-process Node.js деплоя (один сервер).
 * При горизонтальном масштабировании нужен Redis.
 */

interface Window {
	timestamps: number[];
	blocked?: number; // unixtime when block expires
}

const store = new Map<string, Window>();

// Очищаем старые записи каждые 5 минут чтобы не копить память
setInterval(() => {
	const cutoff = Date.now() - 60_000;
	for (const [key, win] of store.entries()) {
		if (win.blocked && win.blocked < Date.now()) {
			store.delete(key);
		} else if (!win.timestamps.some((t) => t > cutoff)) {
			store.delete(key);
		}
	}
}, 5 * 60_000);

export interface RateLimitOptions {
	/** Максимум запросов за windowMs */
	limit?: number;
	/** Окно в миллисекундах (default: 60 000 = 1 мин) */
	windowMs?: number;
	/** Блокировать на это время после превышения (default: 60 000 = 1 мин) */
	blockMs?: number;
}

/**
 * Проверяет rate limit для данного ключа (обычно IP).
 * @returns true если запрос разрешён, false если заблокирован
 */
export function checkRateLimit(
	key: string,
	{ limit = 60, windowMs = 60_000, blockMs = 60_000 }: RateLimitOptions = {}
): boolean {
	const now = Date.now();
	let win = store.get(key);

	// Если IP в блоке — отклоняем
	if (win?.blocked && win.blocked > now) return false;

	if (!win) {
		win = { timestamps: [] };
		store.set(key, win);
	}

	// Убираем записи старше окна
	win.timestamps = win.timestamps.filter((t) => now - t < windowMs);

	if (win.timestamps.length >= limit) {
		win.blocked = now + blockMs;
		return false;
	}

	win.timestamps.push(now);
	return true;
}

/**
 * Возвращает IP из SvelteKit RequestEvent.
 * Учитывает X-Forwarded-For от reverse proxy (nginx).
 */
export function getClientIp(request: Request): string {
	const xff = request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0].trim();
	return 'unknown';
}
