<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { goto } from '$app/navigation';
	import { homeExitAnimating } from '$lib/stores/home-exit';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Время совпадает с transition на шапке/контенте в +layout */
	const EXIT_MS = 480;

	let navigating = $state(false);

	function prefersReducedMotion(): boolean {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	async function handleHomeSearch(query: string) {
		if (navigating) return;
		const slug = data.cities[0]?.slug ?? 'tbilisi';
		const trimmed = query.trim();
		const params = new URLSearchParams();
		if (trimmed) params.set('q', trimmed);
		const qs = params.toString();
		const url = qs ? `/${slug}?${qs}` : `/${slug}`;

		if (prefersReducedMotion()) {
			await goto(url);
			return;
		}

		navigating = true;
		homeExitAnimating.set(true);
		window.setTimeout(() => {
			goto(url).finally(() => {
				navigating = false;
			});
		}, EXIT_MS);
	}
</script>

<svelte:head>
	<title>TradeHub — Доска объявлений из Telegram</title>
	<meta
		name="description"
		content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое."
	/>
</svelte:head>

<section class="hero hero--landing">
	<div class="hero-inner fade-in">
		<div class="hero-text">
			<h1 class="hero-title">
				Объявления рядом — в <span class="hero-title-accent">одном месте</span>
			</h1>
			<p class="hero-subtitle">
				Телеграм-барахолки Батуми и Тбилиси: без лишнего шума, только поиск и фильтры.
			</p>
		</div>
		<div class="home-search">
			<SearchBar
				value=""
				placeholder="Что ищешь? iPhone, велосипед, диван..."
				onSearch={handleHomeSearch}
			/>
		</div>
	</div>
</section>

<style>
	.hero--landing {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0 0.75rem;
		min-height: 0;
		overflow: hidden;
	}

	.hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(0.75rem, 3vw, 1.5rem);
		width: 100%;
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem;
		max-height: 100%;
	}

	.hero-text {
		text-align: center;
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
		margin: 0 auto;
		margin-top: 0.75rem;
	}

	.home-search {
		width: 100%;
	}

	@media (max-height: 560px) {
		.hero-title {
			font-size: clamp(1.25rem, 4vw, 1.5rem);
		}

		.hero-subtitle {
			font-size: 0.8125rem;
			line-height: 1.45;
			margin-top: 0.35rem;
		}

		.hero-inner {
			gap: 0.5rem;
		}
	}
</style>
