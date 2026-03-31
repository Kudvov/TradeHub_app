<script lang="ts">
	import CitySelector from '$lib/components/CitySelector.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();

	function handleSearch(query: string) {
		if (query.trim()) {
			window.location.href = `/${data.cities[0]?.slug ?? 'tbilisi'}?q=${encodeURIComponent(query)}`;
		}
	}
</script>

<svelte:head>
	<title>TradeHub — Доска объявлений из Telegram</title>
	<meta name="description" content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое." />
</svelte:head>

<section class="hero">
	<div class="container hero-content fade-in">
		<div class="hero-badge badge">
			<span>⚡</span> Агрегатор из Telegram
		</div>
		<h1 class="hero-title">
			Найди лучшее в
			<span class="text-gradient">своём городе</span>
		</h1>
		<p class="hero-subtitle">
			Объявления из Telegram-барахолок в одном месте. Электроника, одежда, авто, мебель — всё, что продают рядом с тобой.
		</p>
		<div class="hero-search">
			<SearchBar placeholder="Что ищешь? iPhone, велосипед, диван..." onSearch={handleSearch} />
		</div>
		<div class="hero-stats">
			{#each data.cities as city (city.id)}
				{#if city.listingsCount > 0}
					<span class="stat-item">{city.name}: <strong>{city.listingsCount}</strong></span>
				{/if}
			{/each}
		</div>
	</div>
	<div class="hero-glow"></div>
</section>

<section class="cities-section">
	<div class="container">
		<h2 class="section-title">Выбери город</h2>
		<CitySelector cities={data.cities} />
	</div>
</section>

<style>
	.hero {
		position: relative;
		padding: 4rem 0 3rem;
		overflow: hidden;
	}

	.hero-content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1.25rem;
		max-width: 640px;
		margin: 0 auto;
	}

	.hero-badge {
		font-size: 0.8125rem;
	}

	.hero-title {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.hero-subtitle {
		font-size: 1.0625rem;
		color: var(--text-secondary);
		line-height: 1.6;
		max-width: 520px;
	}

	.hero-search {
		width: 100%;
		display: flex;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.hero-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.stat-item strong {
		color: var(--text-secondary);
	}

	.hero-glow {
		position: absolute;
		top: -40%;
		left: 50%;
		transform: translateX(-50%);
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
		pointer-events: none;
		z-index: 0;
	}

	.cities-section {
		padding: 2rem 0 4rem;
	}

	.section-title {
		font-size: 1.375rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		color: var(--text-primary);
	}
</style>
