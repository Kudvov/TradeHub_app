import type { Action } from 'svelte/action';

/** Переносит узел в `target` (по умолчанию `document.body`), чтобы `position: fixed` был относительно окна, а не предка с filter/backdrop-filter. */
export const portal: Action<HTMLElement, HTMLElement | undefined> = (node, target) => {
	if (typeof document === 'undefined') return {};

	const el = target ?? document.body;
	el.appendChild(node);

	return {
		destroy() {
			node.remove();
		}
	};
};
