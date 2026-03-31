import { dev } from '$app/environment';

/**
 * Мок-данные в dev, если БД недоступна (удобно без Docker).
 * Чтобы видеть ошибку вместо моков: в .env задайте DEV_ALLOW_MOCK=0
 */
export function allowMockDataFallback(): boolean {
	return dev && process.env.DEV_ALLOW_MOCK !== '0';
}
