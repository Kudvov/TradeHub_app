import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator } from 'svelte-i18n';
import { typografMessages } from './i18n/typograf-messages';

const defaultLocale = 'ru';

register('ru', () =>
	import('./locales/ru.json').then((m) => ({
		default: typografMessages('ru', m.default as Record<string, string>)
	}))
);
register('en', () =>
	import('./locales/en.json').then((m) => ({
		default: typografMessages('en', m.default as Record<string, string>)
	}))
);
register('ka', () => import('./locales/ka.json'));

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? (localStorage.getItem('locale') || getLocaleFromNavigator() || defaultLocale) : defaultLocale,
});
