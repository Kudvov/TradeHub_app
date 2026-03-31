<script lang="ts">
	import { formatPrice, formatDate } from '$lib/utils/format';
	import { getContactHref, isPhoneContact, isTelegramProfileHref } from '$lib/utils/contact';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const listing = $derived(data.listing);
	const sellerContactHref = $derived(listing.contact ? getContactHref(listing.contact) : '#');
	const groupHref = $derived(
		listing.telegramGroup?.username
			? `https://t.me/${listing.telegramGroup.username.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`
			: '#'
	);
	const contactHref = $derived(sellerContactHref);
	const hasValidContactHref = $derived(contactHref !== '#');
	const canWriteSeller = $derived(isTelegramProfileHref(contactHref));

	const images: string[] = $derived(listing.images && listing.images.length > 0
		? listing.images
		: ['https://placehold.co/800x600/1a1a2e/6a6a7a?text=No+Photo']);

	let activeImage = $state(0);
	let isLightboxOpen = $state(false);

	function isPhone(contact: string): boolean {
		return isPhoneContact(contact);
	}

	function openLightbox(index: number): void {
		activeImage = index;
		isLightboxOpen = true;
	}

	function closeLightbox(): void {
		isLightboxOpen = false;
	}

	function showPrevImage(): void {
		activeImage = (activeImage - 1 + images.length) % images.length;
	}

	function showNextImage(): void {
		activeImage = (activeImage + 1) % images.length;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (!isLightboxOpen) return;
		if (event.key === 'Escape') closeLightbox();
		if (event.key === 'ArrowLeft') showPrevImage();
		if (event.key === 'ArrowRight') showNextImage();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
				<button class="main-image" onclick={() => openLightbox(activeImage)} aria-label="Открыть фото на весь экран">
					<img src={images[activeImage]} alt={listing.title} />
				</button>
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
					{#if groupHref !== '#'}
						<div class="attr">
							<span class="attr-label">💬 Объявление из группы</span>
							<a
								href={groupHref}
								target="_blank"
								rel="noopener"
								class="attr-value contact-link"
							>
								{listing.telegramGroup?.title ?? listing.telegramGroup?.username}
							</a>
						</div>
					{/if}
				</div>

				{#if canWriteSeller}
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
						💬 Написать продавцу
					</a>
				{/if}
			</div>
		</div>
	</div>
</section>

{#if isLightboxOpen}
	<div class="lightbox-overlay" role="dialog" aria-modal="true" aria-label="Просмотр фото" onclick={closeLightbox}>
		<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
			<button class="lightbox-close" onclick={closeLightbox} aria-label="Закрыть">✕</button>
			{#if images.length > 1}
				<button class="lightbox-nav lightbox-prev" onclick={showPrevImage} aria-label="Предыдущее фото">‹</button>
			{/if}
			<img class="lightbox-image" src={images[activeImage]} alt="{listing.title} (фото {activeImage + 1})" />
			{#if images.length > 1}
				<button class="lightbox-nav lightbox-next" onclick={showNextImage} aria-label="Следующее фото">›</button>
			{/if}
			{#if images.length > 1}
				<div class="lightbox-counter">{activeImage + 1} / {images.length}</div>
			{/if}
		</div>
	</div>
{/if}

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
		padding: 0;
		width: 100%;
		cursor: zoom-in;
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

	.lightbox-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.lightbox-content {
		position: relative;
		width: min(1200px, 100%);
		max-height: 95vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox-image {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: var(--radius-md);
	}

	.lightbox-close,
	.lightbox-nav {
		position: absolute;
		background: rgba(0, 0, 0, 0.45);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.25);
		cursor: pointer;
	}

	.lightbox-close {
		top: -0.5rem;
		right: -0.5rem;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
	}

	.lightbox-nav {
		top: 50%;
		transform: translateY(-50%);
		width: 2.25rem;
		height: 3rem;
		font-size: 1.5rem;
		border-radius: var(--radius-sm);
	}

	.lightbox-prev {
		left: 0.5rem;
	}

	.lightbox-next {
		right: 0.5rem;
	}

	.lightbox-counter {
		position: absolute;
		bottom: -1.75rem;
		left: 50%;
		transform: translateX(-50%);
		color: #fff;
		font-size: 0.875rem;
		opacity: 0.85;
	}
</style>
