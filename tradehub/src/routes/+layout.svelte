<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const activeCity = $derived.by(() => {
		const first = $page.url.pathname.split('/').filter(Boolean)[0];
		if (!first) return null;
		return data.cities.find((c) => c.slug === first) ?? null;
	});

	const searchBarValue = $derived(activeCity ? ($page.url.searchParams.get('q') ?? '') : '');

	const searchPlaceholder = $derived(
		activeCity ? `Поиск в ${activeCity.name}...` : 'Что ищешь? iPhone, велосипед, диван...'
	);

	function handleLayoutSearch(query: string) {
		const slug = activeCity?.slug ?? data.cities[0]?.slug ?? 'tbilisi';
		const trimmed = query.trim();
		const params = new URLSearchParams();
		if (activeCity) {
			const cat = $page.url.searchParams.get('category');
			if (cat) params.set('category', cat);
		}
		if (trimmed) params.set('q', trimmed);
		const qs = params.toString();
		goto(qs ? `/${slug}?${qs}` : `/${slug}`);
	}
</script>

<svelte:head>
	<title>TradeHub — Объявления из Telegram</title>
</svelte:head>

<Header cities={data.cities} />

<div class="layout-search-sticky">
	<div class="container layout-search-inner">
		<SearchBar value={searchBarValue} placeholder={searchPlaceholder} onSearch={handleLayoutSearch} />
	</div>
</div>

<main class="main-content">
	{@render children()}
</main>

<footer class="footer">
	<div class="container footer-inner">
		<div class="footer-brand">
			<span class="footer-logo">Trade<span class="footer-logo-muted">Hub</span></span>
			<p class="text-sm text-muted">Объявления из Telegram-барахолок</p>
		</div>
		<div class="footer-links">
			{#each data.cities as city (city.id)}
				<a href="/{city.slug}" class="footer-link">{city.name}</a>
			{/each}
		</div>
		<p class="footer-copy text-xs text-muted">© {new Date().getFullYear()} TradeHub. Данные из открытых Telegram-групп.</p>
	</div>
</footer>

<style>
	.layout-search-sticky {
		position: sticky;
		top: 64px;
		z-index: 90;
		padding: 0.5rem 0;
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border);
	}

	.layout-search-inner {
		display: flex;
		justify-content: center;
	}

	.main-content {
		position: relative;
		z-index: 1;
		min-height: calc(100dvh - 64px - 200px);
	}

	.footer {
		position: relative;
		z-index: 1;
		margin-top: 3rem;
		padding: 2rem 0;
		border-top: 1px solid var(--border);
		background: var(--bg-secondary);
	}

	.footer-inner {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		text-align: center;
	}

	.footer-logo {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.footer-logo-muted {
		font-weight: 500;
		color: var(--text-muted);
	}

	.footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.footer-link {
		font-size: 0.875rem;
		color: var(--text-secondary);
		transition: color var(--transition-fast);
	}

	.footer-link:hover {
		color: var(--accent);
	}

	.footer-copy {
		padding-top: 0.5rem;
	}
</style>
