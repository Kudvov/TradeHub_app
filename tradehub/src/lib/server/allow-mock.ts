/**
 * Мок-данные отключены. При недоступности БД сервер вернёт 503.
 * Для локальной разработки поднимите БД через docker compose up -d.
 */
export function allowMockDataFallback(): boolean {
	return false;
}
