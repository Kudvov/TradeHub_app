<script lang="ts">
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

<style>
	.city-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		text-decoration: none;
		color: inherit;
	}

	.city-icon-wrap {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: var(--accent-subtle);
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.city-info {
		flex: 1;
		min-width: 0;
	}

	.city-name {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text-primary);
	}

	.city-count {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.city-arrow {
		color: var(--text-muted);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.city-card:hover .city-arrow {
		color: var(--accent);
		transform: translateX(4px);
	}
</style>
