<script lang="ts">
	import { formatPrice, formatDate } from '$lib/utils/format';
	import { getContactHref, isPhoneContact } from '$lib/utils/contact';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const listing = $derived(data.listing);
	const contactHref = $derived(listing.contact ? getContactHref(listing.contact) : '#');
	const hasValidContactHref = $derived(contactHref !== '#');

	const images: string[] = $derived(listing.images && listing.images.length > 0
		? listing.images
		: ['https://placehold.co/800x600/1a1a2e/6a6a7a?text=No+Photo']);

	let activeImage = $state(0);

	function isPhone(contact: string): boolean {
		return isPhoneContact(contact);
	}
</script>

<svelte:head>
	<title>{listing.title} — {listing.city?.name} | TradeHub</title>
	<meta name="description" content="{listing.description?.slice(0, 160) ?? listing.title}" />
</svelte:head>

<section class="listing-detail">
	<div class="container">
		<!-- Breadcrumb -->
		<nav class="breadcrumb fade-in" id="listing-breadcrumb">
			<a href="/">Главная</a>
			<span class="sep">/</span>
			{#if listing.city}
				<a href="/{listing.city.slug}">{listing.city.name}</a>
				<span class="sep">/</span>
			{/if}
			<span class="current">{listing.title}</span>
		</nav>

		<div class="detail-grid fade-in">
			<!-- Images -->
			<div class="detail-images" id="listing-images">
				<div class="main-image">
					<img src={images[activeImage]} alt={listing.title} />
				</div>
				{#if images.length > 1}
					<div class="image-thumbs">
						{#each images as img, i}
							<button
								class="thumb"
								class:active={i === activeImage}
								onclick={() => (activeImage = i)}
							>
								<img src={img} alt="Фото {i + 1}" />
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Info -->
			<div class="detail-info" id="listing-info">
				<div class="detail-meta">
					{#if listing.category}
						<span class="badge">{listing.category.icon} {listing.category.name}</span>
					{/if}
					<span class="detail-date text-muted text-sm">{formatDate(listing.publishedAt)}</span>
				</div>

				<h1 class="detail-title">{listing.title}</h1>

				<div class="detail-price-block">
					<span class="detail-price">{formatPrice(listing.price, listing.currency)}</span>
				</div>

				{#if listing.description}
					<div class="detail-description">
						<h3 class="detail-section-title">Описание</h3>
						<p>{listing.description}</p>
					</div>
				{/if}

				<div class="detail-attrs">
					{#if listing.city}
						<div class="attr">
							<span class="attr-label">📍 Город</span>
							<span class="attr-value">{listing.city.name}</span>
						</div>
					{/if}
					{#if listing.contact}
						<div class="attr">
							<span class="attr-label">{isPhone(listing.contact) ? '📞 Телефон' : '💬 Контакт'}</span>
							<a
								href={contactHref}
								target={hasValidContactHref ? '_blank' : undefined}
								rel={hasValidContactHref ? 'noopener' : undefined}
								class="attr-value contact-link"
								class:disabled={!hasValidContactHref}
								aria-disabled={!hasValidContactHref}
								tabindex={hasValidContactHref ? undefined : -1}
							>
								{listing.contact}
							</a>
						</div>
					{/if}
					{#if listing.telegramGroup}
						<div class="attr">
							<span class="attr-label">📢 Источник</span>
							<span class="attr-value">{listing.telegramGroup.title}</span>
						</div>
					{/if}
				</div>

				{#if listing.contact}
					<a
						href={contactHref}
						target={hasValidContactHref ? '_blank' : undefined}
						rel={hasValidContactHref ? 'noopener' : undefined}
						class="btn btn-primary btn-lg contact-btn"
						class:disabled={!hasValidContactHref}
						aria-disabled={!hasValidContactHref}
						tabindex={hasValidContactHref ? undefined : -1}
						id="contact-seller-btn"
					>
						{isPhone(listing.contact) ? '📞 Позвонить продавцу' : '💬 Написать продавцу'}
					</a>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.listing-detail {
		padding: 1.5rem 0 4rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.breadcrumb a {
		color: var(--text-muted);
	}

	.breadcrumb a:hover {
		color: var(--accent);
	}

	.sep {
		color: var(--text-muted);
		opacity: 0.5;
	}

	.current {
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.detail-grid {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
		}
	}

	.main-image {
		aspect-ratio: 4 / 3;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
	}

	.main-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.image-thumbs {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.thumb {
		width: 64px;
		height: 48px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 2px solid var(--border);
		cursor: pointer;
		transition: all var(--transition-fast);
		padding: 0;
		background: none;
	}

	.thumb.active {
		border-color: var(--accent);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.detail-info {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.detail-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.detail-title {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	.detail-price-block {
		padding: 1rem 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.detail-price {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--success);
	}

	.detail-section-title {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.detail-description p {
		font-size: 0.9375rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.detail-attrs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
	}

	.attr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.attr-label {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.attr-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.contact-link {
		color: var(--accent) !important;
	}

	.disabled {
		pointer-events: none;
		opacity: 0.55;
		cursor: default;
	}

	.contact-btn {
		width: 100%;
		margin-top: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}
</style>
