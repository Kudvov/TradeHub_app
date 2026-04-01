import { writable } from 'svelte/store';

/** Плавный выход с главной: лейаут подписывается и гасит шапку + контент */
export const homeExitAnimating = writable(false);
