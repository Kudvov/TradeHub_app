<script lang="ts">
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head>
	<title>TradeHub — Доска объявлений из Telegram</title>
	<meta name="description" content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое." />
</svelte:head>

<section class="hero">
	<div class="container hero-content fade-in">
		<h1 class="hero-title">
			Объявления рядом — в <span class="hero-title-accent">одном месте</span>
		</h1>
		<p class="hero-subtitle">
			Телеграм-барахолки Батуми и Тбилиси: без лишнего шума, только поиск и фильтры.
		</p>
		<div class="hero-cities">
			{#each data.cities as city (city.id)}
				<a href="/{city.slug}" class="hero-city-btn">
					{city.name}
					{#if city.newCount > 0}
						<span class="hero-city-new">+{city.newCount} за 24ч</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		padding: 3rem 0 4rem;
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1rem;
		max-width: 28rem;
		margin: 0 auto;
	}

	.hero-title {
		font-size: clamp(1.5rem, 4vw, 2rem);
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.hero-title-accent {
		color: var(--text-muted);
		font-weight: 500;
	}

	.hero-subtitle {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		line-height: 1.55;
		max-width: 24rem;
	}

	.hero-cities {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.25rem;
	}

	.hero-city-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
		text-decoration: none;
		transition: border-color var(--transition-fast);
	}

	.hero-city-btn:hover {
		border-color: var(--border-hover);
	}

	.hero-city-new {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted);
	}
</style>
