import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	// Отключаем если DSN не задан (локальная разработка)
	enabled: !!process.env.SENTRY_DSN,
	environment: process.env.NODE_ENV ?? 'production',
	tracesSampleRate: 0.1,
	// Не отправлять ожидаемые ошибки клиентов
	beforeSend(event) {
		const status = event.tags?.['sveltekit.route.status'];
		if (status === 404 || status === 400 || status === 429) return null;
		return event;
	}
});

// Ловит необработанные ошибки сервера и отправляет в Sentry
export const handleError = Sentry.handleErrorWithSentry();
