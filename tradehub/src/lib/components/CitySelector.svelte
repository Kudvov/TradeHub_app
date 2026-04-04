<script lang="ts">
	import './CitySelector.css';
	import type { City } from '$lib/types';

	let { cities = [] }: { cities: City[] } = $props();
</script>

<section class="city-selector" id="city-selector">
	<div class="grid-cities">
		{#each cities as city (city.id)}
			<a href="/{city.slug}" class="city-card card" id="city-{city.slug}">
				<div class="city-icon-wrap">
					<span class="city-icon">🏙</span>
				</div>
				<div class="city-info">
					<h3 class="city-name">{city.name}</h3>
					<span class="city-count">
						{city.listingsCount}
						{city.listingsCount === 1 ? 'объявление' : city.listingsCount < 5 ? 'объявления' : 'объявлений'}
					</span>
				</div>
				<div class="city-arrow">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</div>
			</a>
		{/each}
	</div>
</section>
