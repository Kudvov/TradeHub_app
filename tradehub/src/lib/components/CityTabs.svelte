<script lang="ts">
	import './CityTabs.css';
	import { _ } from 'svelte-i18n';
	import type { City } from '$lib/types';

	let {
		cities,
		activeSlug = null,
		onSelect
	}: {
		cities: City[];
		activeSlug?: string | null;
		onSelect?: (slug: string | null) => void;
	} = $props();

	function handleAll() {
		onSelect?.(null);
	}

	function handleCity(slug: string) {
		onSelect?.(slug);
	}
</script>

<div class="city-tabs" role="tablist">
	<button
		role="tab"
		aria-selected={activeSlug === null}
		class="city-tabs-btn"
		class:city-tabs-btn--active={activeSlug === null}
		onclick={handleAll}
	>
		{$_('city_all_listings')}
	</button>
	{#each cities as city (city.id)}
		<button
			role="tab"
			aria-selected={activeSlug === city.slug}
			class="city-tabs-btn"
			class:city-tabs-btn--active={activeSlug === city.slug}
			onclick={() => handleCity(city.slug)}
		>
			{city.name}
		</button>
	{/each}
</div>
