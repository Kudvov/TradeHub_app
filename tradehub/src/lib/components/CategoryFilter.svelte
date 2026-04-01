<script lang="ts">
	import type { Category } from '$lib/types';

	let {
		categories = [],
		activeSlug = '',
		onSelect
	}: {
		categories: Category[];
		activeSlug?: string;
		onSelect?: (slug: string) => void;
	} = $props();

	function handleClick(slug: string) {
		if (slug === activeSlug) {
			onSelect?.('');
		} else {
			onSelect?.(slug);
		}
	}
</script>

<div class="category-filter" id="category-filter">
	<button
		class="filter-chip"
		class:active={activeSlug === ''}
		onclick={() => handleClick('')}
		id="category-all"
	>
		Все
	</button>
	{#each categories as cat (cat.id)}
		<button
			class="filter-chip"
			class:active={activeSlug === cat.slug}
			onclick={() => handleClick(cat.slug)}
			id="category-{cat.slug}"
		>
			{cat.name}
		</button>
	{/each}
</div>

<style>
	.category-filter {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding: 0.25rem 0;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.category-filter::-webkit-scrollbar {
		display: none;
	}

	.filter-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-full);
		background: var(--bg-card);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--transition-fast);
		min-height: 40px;
	}

	.filter-chip:hover {
		border-color: var(--border-hover);
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.filter-chip.active {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-secondary);
	}
</style>
