import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: import.meta.env.PUBLIC_SENTRY_DSN,
	enabled: !!import.meta.env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	tracesSampleRate: 0.05,
	// Перехватывать только настоящие ошибки, не 404/сетевые
	ignoreErrors: [
		'ResizeObserver loop limit exceeded',
		'Non-Error promise rejection captured',
		/^Loading chunk/
	]
});

export const handleError = Sentry.handleErrorWithSentry();
