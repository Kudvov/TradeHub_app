<script lang="ts">
	import './city-page.css';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import PeriodSelect from '$lib/components/PeriodSelect.svelte';
	import ListingCard from '$lib/components/ListingCard.svelte';
	import type { ListingPeriodSlug } from '$lib/listing-period';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type PaginationItem = number | '...';

	function buildUrl(params: { category?: string; q?: string; page?: number; period?: ListingPeriodSlug; priceMin?: number | null; priceMax?: number | null }) {
		const base = `/${data.city.slug}`;
		const searchParams = new URLSearchParams();
		const cat = params.category ?? data.filters.categorySlug;
		const q = params.q ?? data.filters.query;
		const period = params.period !== undefined ? params.period : data.filters.periodSlug;
		const pg = params.page ?? 1;
		const priceMin = 'priceMin' in params ? params.priceMin : data.filters.priceMin;
		const priceMax = 'priceMax' in params ? params.priceMax : data.filters.priceMax;

		if (cat) searchParams.set('category', cat);
		if (q) searchParams.set('q', q);
		if (period) searchParams.set('period', period);
		if (pg > 1) searchParams.set('page', String(pg));
		if (priceMin !== null && priceMin !== undefined) searchParams.set('priceMin', String(priceMin));
		if (priceMax !== null && priceMax !== undefined) searchParams.set('priceMax', String(priceMax));

		const qs = searchParams.toString();
		return qs ? `${base}?${qs}` : base;
	}

	function handleCategorySelect(slug: string) {
		goto(buildUrl({ category: slug, page: 1 }));
	}

	function handlePeriodSelect(slug: ListingPeriodSlug) {
		goto(buildUrl({ period: slug, page: 1 }));
	}

	function handlePage(pg: number) {
		goto(buildUrl({ page: pg }));
	}

	function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}
		const items: PaginationItem[] = [1];
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);
		if (start > 2) items.push('...');
		for (let p = start; p <= end; p++) items.push(p);
		if (end < totalPages - 1) items.push('...');
		items.push(totalPages);
		return items;
	}
</script>

<svelte:head>
	<title>{data.city.name} — объявления | teleposter</title>
	<meta name="description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
	<link rel="canonical" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="ru" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="en" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="ka" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="x-default" href="{$page.url.origin}/{data.city.slug}" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="teleposter" />
	<meta property="og:url" content="{$page.url.origin}/{data.city.slug}" />
	<meta property="og:title" content="{data.city.name} — объявления | teleposter" />
	<meta property="og:description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
	<meta property="og:image" content="{$page.url.origin}/og-image.png" />
	<meta property="og:locale" content="ru_RU" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{data.city.name} — объявления | teleposter" />
	<meta name="twitter:description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
	<meta name="twitter:image" content="{$page.url.origin}/og-image.png" />
</svelte:head>

<section class="city-page">
	<div class="container">
		<div class="city-layout">

			<!-- LEFT SIDEBAR: filters -->
			<aside class="city-sidebar">
				<div class="sidebar-header">
					<h1 class="city-page-title">{$_(`city_${data.city.slug}`) || data.city.name}</h1>
					<p class="city-page-count text-secondary">
						{data.total}
						{data.total === 1 ? $_('listings_count_one') : data.total < 5 ? $_('listings_count_few') : $_('listings_count_many')}
					</p>
				</div>

				<div class="city-sidebar-sticky">
				<!-- Period -->
				<div class="sidebar-section">
					<p class="sidebar-label">{$_('period_label')}</p>
					<PeriodSelect activePeriod={data.filters.periodSlug} onSelect={handlePeriodSelect} />
				</div>

				<!-- Categories -->
				<div class="sidebar-section">
					<CategoryFilter
						categories={data.categories}
						activeSlug={data.filters.categorySlug}
						onSelect={handleCategorySelect}
					/>
				</div>

				<!-- Price filter -->
				<div class="sidebar-section">
					<p class="sidebar-label">{$_('price_from_to')}</p>
					<form method="GET" action="/{data.city.slug}" class="price-filter-form">
						{#if data.filters.categorySlug}<input type="hidden" name="category" value={data.filters.categorySlug} />{/if}
						{#if data.filters.query}<input type="hidden" name="q" value={data.filters.query} />{/if}
						{#if data.filters.periodSlug}<input type="hidden" name="period" value={data.filters.periodSlug} />{/if}
						<div class="price-filter-inputs">
							<input class="price-input" type="text" inputmode="numeric" pattern="[0-9]*" name="priceMin" placeholder={$_('price_from')} value={data.filters.priceMin ?? ''} aria-label={$_('price_from')} />
							<span class="price-sep">—</span>
							<input class="price-input" type="text" inputmode="numeric" pattern="[0-9]*" name="priceMax" placeholder={$_('price_to')} value={data.filters.priceMax ?? ''} aria-label={$_('price_to')} />
							<button type="submit" class="btn btn-sm btn-secondary">{$_('apply')}</button>
							{#if data.filters.priceMin !== null || data.filters.priceMax !== null}
								<a href="/{data.city.slug}{data.filters.categorySlug ? `?category=${data.filters.categorySlug}` : ''}" class="price-reset" aria-label={$_('reset_filter')}>✕</a>
							{/if}
						</div>
					</form>
				</div>
				</div>
			</aside>

			<!-- RIGHT CONTENT: listings -->
			<main class="city-content">
				{#if data.listings.length > 0}
					<div class="grid-listings">
						{#each data.listings as listing, i (listing.id)}
							<div class="fade-in" style="animation-delay: {i * 50}ms">
								<ListingCard {listing} />
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state fade-in">
						<span class="empty-icon">🔍</span>
						<h3>{$_('listings_not_found')}</h3>
						<p class="text-secondary">{$_('listings_not_found_hint')}</p>
					</div>
				{/if}

				{#if data.totalPages > 1}
					<nav class="pagination" id="pagination">
						{#if data.page > 1}
							<button class="btn btn-secondary btn-sm" onclick={() => handlePage(data.page - 1)}>
								{$_('pagination_prev')}
							</button>
						{/if}

						<div class="pagination-pages">
							{#each getPaginationItems(data.page, data.totalPages) as item}
								{#if item === '...'}
									<span class="pagination-ellipsis">…</span>
								{:else}
									<button
										class="pagination-page btn btn-sm"
										class:active={item === data.page}
										onclick={() => handlePage(item)}
										aria-current={item === data.page ? 'page' : undefined}
									>
										{item}
									</button>
								{/if}
							{/each}
						</div>

						{#if data.page < data.totalPages}
							<button class="btn btn-secondary btn-sm" onclick={() => handlePage(data.page + 1)}>
								{$_('pagination_next')}
							</button>
						{/if}
					</nav>
				{/if}
			</main>

		</div>
	</div>
</section>
