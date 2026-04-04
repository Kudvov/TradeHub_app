<script lang="ts">
	import './city-page.css';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import PeriodSelect from '$lib/components/PeriodSelect.svelte';
	import PriceFilter from '$lib/components/PriceFilter.svelte';
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
		const page = params.page ?? 1;
		const priceMin = 'priceMin' in params ? params.priceMin : data.filters.priceMin;
		const priceMax = 'priceMax' in params ? params.priceMax : data.filters.priceMax;

		if (cat) searchParams.set('category', cat);
		if (q) searchParams.set('q', q);
		if (period) searchParams.set('period', period);
		if (page > 1) searchParams.set('page', String(page));
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

	function handlePriceFilter(min: number | null, max: number | null) {
		goto(buildUrl({ priceMin: min, priceMax: max, page: 1 }));
	}

	function handlePage(page: number) {
		goto(buildUrl({ page }));
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
	<!-- hreflang -->
	<link rel="alternate" hreflang="ru" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="en" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="ka" href="{$page.url.origin}/{data.city.slug}" />
	<link rel="alternate" hreflang="x-default" href="{$page.url.origin}/{data.city.slug}" />
	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="teleposter" />
	<meta property="og:url" content="{$page.url.origin}/{data.city.slug}" />
	<meta property="og:title" content="{data.city.name} — объявления | teleposter" />
	<meta property="og:description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
	<meta property="og:image" content="{$page.url.origin}/og-image.png" />
	<meta property="og:locale" content="ru_RU" />
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{data.city.name} — объявления | teleposter" />
	<meta name="twitter:description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
	<meta name="twitter:image" content="{$page.url.origin}/og-image.png" />
</svelte:head>

<section class="city-page">
	<div class="container">
		<!-- City header -->
		<div class="city-header fade-in">
			<div class="city-header-info">
				<h1 class="city-page-title">{$_(`city_${data.city.slug}`) || data.city.name}</h1>
				<p class="city-page-count text-secondary">
					{data.total}
					{data.total === 1 ? $_('listings_count_one') : data.total < 5 ? $_('listings_count_few') : $_('listings_count_many')}
				</p>
			</div>
		</div>

		<!-- Categories + period (dropdown) -->
		<div class="city-filters">
			<div class="city-filters-row">
				<div class="city-filters-categories">
					<CategoryFilter
						categories={data.categories}
						activeSlug={data.filters.categorySlug}
						onSelect={handleCategorySelect}
					/>
				</div>
				<div class="city-filters-right">
					{#key `${data.filters.priceMin}-${data.filters.priceMax}`}
						<PriceFilter
							priceMin={data.filters.priceMin}
							priceMax={data.filters.priceMax}
							onFilter={handlePriceFilter}
						/>
					{/key}
					<PeriodSelect activePeriod={data.filters.periodSlug} onSelect={handlePeriodSelect} />
				</div>
			</div>
		</div>

		<!-- Listings grid -->
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

		<!-- Pagination -->
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
	</div>
</section>
