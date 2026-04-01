<script lang="ts">
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import ListingCard from '$lib/components/ListingCard.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type PaginationItem = number | '...';

	function buildUrl(params: { category?: string; q?: string; page?: number }) {
		const base = `/${data.city.slug}`;
		const searchParams = new URLSearchParams();
		const cat = params.category ?? data.filters.categorySlug;
		const q = params.q ?? data.filters.query;
		const page = params.page ?? 1;

		if (cat) searchParams.set('category', cat);
		if (q) searchParams.set('q', q);
		if (page > 1) searchParams.set('page', String(page));

		const qs = searchParams.toString();
		return qs ? `${base}?${qs}` : base;
	}

	function handleCategorySelect(slug: string) {
		goto(buildUrl({ category: slug, page: 1 }));
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
	<title>{data.city.name} — объявления | TradeHub</title>
	<meta name="description" content="Объявления в {data.city.name}: электроника, одежда, авто, мебель и другие товары из Telegram-барахолок." />
</svelte:head>

<section class="city-page">
	<div class="container">
		<!-- City header -->
		<div class="city-header fade-in">
			<div class="city-header-info">
				<a href="/" class="back-link" id="back-to-home">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="15 18 9 12 15 6" />
					</svg>
					Все города
				</a>
				<h1 class="city-page-title">{data.city.name}</h1>
				<p class="city-page-count text-secondary">
					{data.total}
					{data.total === 1 ? 'объявление' : data.total < 5 ? 'объявления' : 'объявлений'}
				</p>
			</div>
		</div>

		<!-- Category filter -->
		<div class="city-filters">
			<CategoryFilter
				categories={data.categories}
				activeSlug={data.filters.categorySlug}
				onSelect={handleCategorySelect}
			/>
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
				<h3>Ничего не найдено</h3>
				<p class="text-secondary">Попробуй изменить фильтры или поисковый запрос</p>
			</div>
		{/if}

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<nav class="pagination" id="pagination">
				{#if data.page > 1}
					<button class="btn btn-secondary btn-sm" onclick={() => handlePage(data.page - 1)}>
						← Назад
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
						Вперёд →
					</button>
				{/if}
			</nav>
		{/if}
	</div>
</section>

<style>
	.city-page {
		padding: 2rem 0;
	}

	.city-header {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 768px) {
		.city-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
		}
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
		transition: color var(--transition-fast);
	}

	.back-link:hover {
		color: var(--accent);
	}

	.city-page-title {
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.city-page-count {
		margin-top: 0.25rem;
		font-size: 0.9375rem;
	}

	.city-filters {
		margin-bottom: 2rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 4rem 1rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}

	.pagination-pages {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.pagination-ellipsis {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		min-height: 36px;
		color: var(--text-muted);
	}

	.pagination-page {
		background: var(--bg-card);
		color: var(--text-secondary);
		border: 1px solid var(--border);
	}

	.pagination-page:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.pagination-page.active {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
</style>
