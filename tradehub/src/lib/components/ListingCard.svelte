<script lang="ts">
	import { formatPrice, formatDate, truncate } from '$lib/utils/format';
	import type { Listing, Category, City } from '$lib/types';

	type ListingData = Listing & { city?: City | null; category?: Category | null };
	let { listing }: { listing: ListingData } = $props();

	const imageUrl = $derived(listing.images && listing.images.length > 0
		? listing.images[0]
		: 'https://placehold.co/400x300/1a1a2e/6a6a7a?text=No+Photo');
</script>

<a href="/listing/{listing.id}" class="listing-card card" id="listing-{listing.id}">
	<div class="card-image">
		<img src={imageUrl} alt={listing.title} loading="lazy" />
		{#if listing.category}
			<span class="card-category badge">{listing.category.icon} {listing.category.name}</span>
		{/if}
	</div>
	<div class="card-body">
		<h3 class="card-title">{truncate(listing.title, 60)}</h3>
		{#if listing.description}
			<p class="card-description">{truncate(listing.description, 90)}</p>
		{/if}
		<div class="card-footer">
			<span class="card-price">{formatPrice(listing.price, listing.currency)}</span>
			<span class="card-meta">
				{#if listing.city}
					<span class="card-city">📍 {listing.city.name}</span>
				{/if}
				<span class="card-time">{formatDate(listing.publishedAt)}</span>
			</span>
		</div>
	</div>
</a>

<style>
	.listing-card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
	}

	.card-image {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: var(--bg-secondary);
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--transition-slow);
	}

	.listing-card:hover .card-image img {
		transform: scale(1.05);
	}

	.card-category {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		backdrop-filter: blur(8px);
		background: var(--card-badge-bg);
		border: 1px solid var(--card-badge-border);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		flex: 1;
	}

	.card-title {
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--text-primary);
	}

	.card-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.card-footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.card-price {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--success);
		white-space: nowrap;
	}

	.card-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.card-city {
		color: var(--text-secondary);
	}
</style>
