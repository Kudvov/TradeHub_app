<script lang="ts">
	import { browser } from '$app/environment';

	let isDark = $state(false);

	if (browser) {
		isDark = document.documentElement.classList.contains('dark');
	}

	function toggle() {
		isDark = !isDark;
		if (browser) {
			document.documentElement.classList.toggle('dark', isDark);
			localStorage.setItem('theme', isDark ? 'dark' : 'light');
		}
	}
</script>

<button
	class="theme-toggle"
	onclick={toggle}
	aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
	title={isDark ? 'Светлая тема' : 'Тёмная тема'}
	id="theme-toggle"
>
	<span class="toggle-icon" class:dark={isDark}>
		{#if isDark}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="5" />
				<line x1="12" y1="1" x2="12" y2="3" />
				<line x1="12" y1="21" x2="12" y2="23" />
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
				<line x1="1" y1="12" x2="3" y2="12" />
				<line x1="21" y1="12" x2="23" y2="12" />
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		{/if}
	</span>
</button>

<style>
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--bg-card);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		padding: 0;
	}

	.theme-toggle:hover {
		border-color: var(--border-hover);
		background: var(--bg-card-hover);
		color: var(--accent);
		transform: scale(1.05);
	}

	.toggle-icon {
		display: flex;
		transition: transform var(--transition-spring);
	}

	.toggle-icon.dark {
		transform: rotate(180deg);
	}
</style>
