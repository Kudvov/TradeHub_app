<script lang="ts">
	import '../app.css';
	import './layout.css';
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { page } from '$app/stores';
	import { afterNavigate, goto, onNavigate } from '$app/navigation';
	import { homeExitAnimating } from '$lib/stores/home-exit';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	onNavigate((navigation) => {
		if (typeof document === 'undefined' || !document.startViewTransition) return;

		return new Promise<void>((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	afterNavigate((nav) => {
		if (nav.to && nav.to.url.pathname !== '/') {
			homeExitAnimating.set(false);
		}
	});

	const activeCity = $derived.by(() => {
		const first = $page.url.pathname.split('/').filter(Boolean)[0];
		if (!first) return null;
		return data.cities.find((c) => c.slug === first) ?? null;
	});

	const searchBarValue = $derived(activeCity ? ($page.url.searchParams.get('q') ?? '') : '');

	const searchPlaceholder = $derived(
		activeCity
			? $_('search_placeholder_city', { values: { city: $_((`city_${activeCity.slug}`)) || activeCity.name } })
			: $_('search_placeholder')
	);

	function citySlugForSearch(): string {
		const p = data.preferredCitySlug;
		if (p && data.cities.some((c) => c.slug === p)) return p;
		return data.cities[0]?.slug ?? 'tbilisi';
	}

	function handleLayoutSearch(query: string) {
		const slug = activeCity?.slug ?? citySlugForSearch();
		const trimmed = query.trim();
		const params = new URLSearchParams();
		if (activeCity) {
			const cat = $page.url.searchParams.get('category');
			if (cat) params.set('category', cat);
			const period = $page.url.searchParams.get('period');
			if (period) params.set('period', period);
		}
		if (trimmed) params.set('q', trimmed);
		const qs = params.toString();
		goto(qs ? `/${slug}?${qs}` : `/${slug}`);
	}
</script>

<svelte:head>
	<title>teleposter — Объявления из Telegram</title>
	<link rel="icon" href="/logo.svg" type="image/svg+xml" />
</svelte:head>

<div
	class="app-root"
	class:app-root--home={$page.url.pathname === '/'}
	class:app-root--home-exit={$page.url.pathname === '/' && $homeExitAnimating}
>
	<Header cities={data.cities} />

	{#if $page.url.pathname !== '/'}
		<div class="layout-search-sticky">
			<div class="container layout-search-inner">
				<SearchBar value={searchBarValue} placeholder={searchPlaceholder} onSearch={handleLayoutSearch} />
			</div>
		</div>
	{/if}

	<main class="main-content" class:main-content--home={$page.url.pathname === '/'}>
		{@render children()}
	</main>

	<SiteFooter cities={data.cities} />
</div>
