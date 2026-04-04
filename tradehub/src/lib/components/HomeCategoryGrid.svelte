<script lang="ts">
	import './HomeCategoryGrid.css';
	import { HOME_CATEGORY_TILES, homeCategoryTileHref } from '$lib/data/home-category-tiles';

	let { citySlug }: { citySlug: string } = $props();
</script>

<nav class="home-category-grid" aria-label="Категории объявлений">
	<div class="home-category-grid-inner">
		{#each HOME_CATEGORY_TILES as tile (tile.label)}
			<a class="home-category-card" href={homeCategoryTileHref(citySlug, tile)}>
				<span class="home-category-label">{tile.label}</span>
				<span class="home-category-deco" aria-hidden="true">{tile.emoji}</span>
			</a>
		{/each}
	</div>
</nav>
