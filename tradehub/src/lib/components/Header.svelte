<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { page } from '$app/stores';

	let {
		cities = []
	}: {
		cities: Array<{ id: number; name: string; slug: string; newCount: number; listingsCount?: number }>;
	} = $props();

	let currentSlug = $derived($page.url.pathname.split('/').filter(Boolean)[0] ?? '');
</script>

<header class="header">
	<div class="container header-inner">
		<a href="/" class="logo" id="header-logo">
			<span class="logo-text">Trade<span class="logo-accent">Hub</span></span>
		</a>

		<nav class="header-nav" id="header-nav">
			{#each cities as city (city.id)}
				<a
					href="/{city.slug}"
					class="city-pill"
					class:active={currentSlug === city.slug}
					aria-current={currentSlug === city.slug ? 'page' : undefined}
				>
					{city.name}
					<span class="city-count" title="Активных объявлений в городе">{(city.listingsCount ?? 0).toLocaleString('ru-RU')}</span>
					{#if city.newCount > 0}
						<span class="city-new" title="Новых объявлений за последние 24 часа">+{city.newCount} за 24ч</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="header-actions">
			<ThemeToggle />
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--header-glass);
		backdrop-filter: blur(8px);
		transition: background var(--transition-base);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
		gap: 1rem;
	}

	.logo {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--text-primary);
		font-weight: 600;
		font-size: 1.0625rem;
		letter-spacing: -0.02em;
		flex-shrink: 0;
	}

	.logo:hover {
		color: var(--text-primary);
	}

	.logo-accent {
		font-weight: 500;
		color: var(--text-muted);
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex: 1;
		justify-content: center;
		min-width: 0;
	}

	.city-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.375rem 0.65rem;
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
		border: 1px solid var(--border);
		background: transparent;
		transition: border-color var(--transition-fast), color var(--transition-fast);
		text-decoration: none;
		white-space: nowrap;
		flex-wrap: nowrap;
	}

	.city-pill:hover {
		color: var(--text-primary);
		border-color: var(--border-hover);
	}

	.city-pill.active {
		color: var(--text-primary);
		border-color: var(--text-primary);
		font-weight: 600;
	}

	.city-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.125rem;
		min-height: 1.125rem;
		padding: 0 0.3rem;
		background: var(--accent-subtle);
		color: var(--text-secondary);
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		line-height: 1;
	}

	.city-new {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--text-muted);
		letter-spacing: -0.02em;
		white-space: nowrap;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.header-inner {
			gap: 0.5rem;
		}

		.header-nav {
			justify-content: flex-start;
			overflow-x: auto;
			scrollbar-width: none;
			-ms-overflow-style: none;
		}

		.header-nav::-webkit-scrollbar {
			display: none;
		}

	}
</style>
