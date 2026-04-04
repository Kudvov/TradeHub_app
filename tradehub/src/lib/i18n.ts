import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator } from 'svelte-i18n';

const defaultLocale = 'ru';

register('ru', () => import('./locales/ru.json'));
register('en', () => import('./locales/en.json'));
register('ka', () => import('./locales/ka.json'));

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? (localStorage.getItem('locale') || getLocaleFromNavigator() || defaultLocale) : defaultLocale,
});
