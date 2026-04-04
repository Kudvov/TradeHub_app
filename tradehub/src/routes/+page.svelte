<script lang="ts">
	import './home.css';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import HomeCategoryGrid from '$lib/components/HomeCategoryGrid.svelte';
	import { goto } from '$app/navigation';
	import { homeExitAnimating } from '$lib/stores/home-exit';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Время совпадает с transition на шапке/контенте в +layout */
	const EXIT_MS = 480;

	let navigating = $state(false);

	function prefersReducedMotion(): boolean {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function defaultCitySlug(): string {
		const p = data.preferredCitySlug;
		if (p && data.cities.some((c) => c.slug === p)) return p;
		return data.cities[0]?.slug ?? 'tbilisi';
	}

	async function handleHomeSearch(query: string) {
		if (navigating) return;
		const slug = defaultCitySlug();
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
	<title>teleposter — Доска объявлений из Telegram</title>
	<meta name="description" content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое." />
	<link rel="canonical" href={$page.url.origin} />
	<!-- hreflang -->
	<link rel="alternate" hreflang="ru" href={$page.url.origin} />
	<link rel="alternate" hreflang="en" href={$page.url.origin} />
	<link rel="alternate" hreflang="ka" href={$page.url.origin} />
	<link rel="alternate" hreflang="x-default" href={$page.url.origin} />
	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="teleposter" />
	<meta property="og:url" content={$page.url.href} />
	<meta property="og:title" content="teleposter — Доска объявлений из Telegram" />
	<meta property="og:description" content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое." />
	<meta property="og:image" content="{$page.url.origin}/og-image.png" />
	<meta property="og:locale" content="ru_RU" />
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="teleposter — Доска объявлений из Telegram" />
	<meta name="twitter:description" content="Ищи лучшие объявления в своём городе. Товары из Telegram-барахолок: электроника, одежда, авто, мебель и многое другое." />
	<meta name="twitter:image" content="{$page.url.origin}/og-image.png" />
</svelte:head>

<section class="hero hero--landing">
	<div class="hero-stack fade-in">
		<div class="hero-inner">
			<div class="hero-text">
				<h1 class="hero-title">
					{$_('home_title')}
				</h1>
				<p class="hero-subtitle">
					{$_('home_subtitle')}
				</p>
			</div>
			<div class="home-search">
				<SearchBar
					value=""
					placeholder={$_('search_placeholder')}
					onSearch={handleHomeSearch}
				/>
			</div>
		</div>
		<HomeCategoryGrid citySlug={defaultCitySlug()} />
	</div>
</section>
