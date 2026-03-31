import { dev } from '$app/environment';

/** Мок-данные только в dev; в production — реальная БД или ошибка */
export function allowMockDataFallback(): boolean {
	return dev;
}
