<script lang="ts">
	import './CategoryFilter.css';
	import { _ } from 'svelte-i18n';
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
		{$_('category_all')}
	</button>
	{#each categories as cat (cat.id)}
		<button
			class="filter-chip"
			class:active={activeSlug === cat.slug}
			onclick={() => handleClick(cat.slug)}
			id="category-{cat.slug}"
		>
			{$_(`cat_${cat.slug}`) || cat.name}
		</button>
	{/each}
</div>
