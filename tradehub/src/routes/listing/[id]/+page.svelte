<script lang="ts">
	import ListingCard from '$lib/components/ListingCard.svelte';
	import { formatPrice, formatDate, maskLinks } from '$lib/utils/format';
	import { getContactHref, isPhoneContact, isTelegramProfileHref } from '$lib/utils/contact';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	const listing = $derived(data.listing);
	const safeTitle = $derived(maskLinks(listing.title));
	const safeDescription = $derived(listing.description ? maskLinks(listing.description) : '');
	const relatedListings = $derived(data.relatedListings ?? []);
	const sellerContactHref = $derived(listing.contact ? getContactHref(listing.contact) : '#');
	const groupHref = $derived.by(() => {
		const usernameRaw = listing.telegramGroup?.username;
		if (!usernameRaw) return '#';
		const username = usernameRaw.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
		const messageId = listing.telegramMessageId ? String(listing.telegramMessageId) : null;
		if (messageId) return `https://t.me/${username}/${messageId}`;
		return `https://t.me/${username}`;
	});
	const contactHref = $derived(sellerContactHref);
	const hasValidContactHref = $derived(contactHref !== '#');
	const canWriteSeller = $derived(isTelegramProfileHref(contactHref));

	const images: string[] = $derived(listing.images && listing.images.length > 0
		? listing.images
		: ['https://placehold.co/800x600/1a1a2e/6a6a7a?text=No+Photo']);

	let activeImage = $state(0);
	let isLightboxOpen = $state(false);
	let isReportOpen = $state(false);
	let showReportToast = $state(false);

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

	function openReport(): void {
		isReportOpen = true;
	}

	function closeReport(): void {
		isReportOpen = false;
	}

	$effect(() => {
		if (form?.success) {
			showReportToast = true;
			const timer = setTimeout(() => {
				showReportToast = false;
			}, 3000);
			return () => clearTimeout(timer);
		}
	});

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
	<title>{safeTitle} — {listing.city?.name} | TradeHub</title>
	<meta name="description" content="{safeDescription?.slice(0, 160) ?? safeTitle}" />
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
			<span class="current">{safeTitle}</span>
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
					<div class="detail-meta-right">
						<span class="detail-date text-muted text-sm">{formatDate(listing.publishedAt)}</span>
						<button
							type="button"
							class="report-icon-btn"
							onclick={openReport}
							aria-label="Пожаловаться на объявление"
							title="Пожаловаться"
						>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
								<line x1="12" y1="9" x2="12" y2="13" />
								<line x1="12" y1="17" x2="12.01" y2="17" />
							</svg>
						</button>
					</div>
				</div>

				<h1 class="detail-title">{safeTitle}</h1>

				<div class="detail-price-block">
					<span class="detail-price">{formatPrice(listing.price, listing.currency)}</span>
				</div>

				{#if listing.description}
					<div class="detail-description">
						<h3 class="detail-section-title">Описание</h3>
						<p>{safeDescription}</p>
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
				{:else if groupHref !== '#'}
					<a
						href={groupHref}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-primary btn-lg contact-btn"
						id="go-to-telegram-post-btn"
					>
						↗ Перейти к объявлению
					</a>
				{/if}
			</div>
		</div>

		{#if relatedListings.length > 0}
			<section class="related-listings fade-in" id="related-listings">
				<h2 class="related-title">Похожие объявления</h2>
				<div class="grid-listings">
					{#each relatedListings as related (related.id)}
						<ListingCard listing={related} />
					{/each}
				</div>
			</section>
		{/if}
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

{#if isReportOpen}
	<div class="report-overlay" role="dialog" aria-modal="true" aria-label="Жалоба на объявление" onclick={closeReport}>
		<div class="report-modal" onclick={(e) => e.stopPropagation()}>
			<div class="report-modal-head">
				<h3>Пожаловаться на объявление</h3>
				<button type="button" class="report-close" onclick={closeReport} aria-label="Закрыть">✕</button>
			</div>
			<form method="POST" action="?/report" class="report-form">
				<select name="reason" required class="report-select">
					<option value="">Выбери причину</option>
					<option value="spam">Спам / реклама</option>
					<option value="fraud">Мошенничество</option>
					<option value="prohibited">Запрещённый контент</option>
					<option value="duplicate">Дубликат</option>
					<option value="other">Другое</option>
				</select>
				<textarea name="details" rows="3" placeholder="Комментарий (необязательно)" class="report-textarea"></textarea>
				<button class="btn btn-secondary" type="submit">Отправить жалобу</button>
				{#if form?.error}
					<p class="report-error">{form.error}</p>
				{/if}
				{#if form?.success}
					<p class="report-success">{form.message}</p>
				{/if}
			</form>
		</div>
	</div>
{/if}

{#if showReportToast}
	<div class="report-toast" role="status" aria-live="polite">
		✅ Жалоба отправлена
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
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.detail-meta-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
		flex-shrink: 0;
	}

	.report-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		color: var(--warning, #ca8a04);
		cursor: pointer;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast),
			color var(--transition-fast);
	}

	.report-icon-btn:hover {
		background: var(--bg-card-hover);
		border-color: var(--border-hover);
		color: var(--text-primary);
	}

	.report-icon-btn:focus-visible {
		outline: 2px solid var(--border-focus);
		outline-offset: 2px;
	}

	.detail-title {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.3;
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.detail-price-block {
		display: inline-block;
		padding: 0.5rem 0.875rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.detail-price {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.2;
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
		overflow-wrap: anywhere;
		word-break: break-word;
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
		overflow-wrap: anywhere;
		word-break: break-word;
		max-width: 100%;
		text-align: right;
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

	.report-form {
		display: grid;
		gap: 0.5rem;
	}

	.report-select,
	.report-textarea {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding: 0.55rem 0.65rem;
		font-family: var(--font-sans);
	}

	@media (max-width: 767px) {
		.attr {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.35rem;
		}

		.attr-value {
			text-align: left;
			width: 100%;
		}
	}

	.report-error {
		color: #ff6b6b;
		font-size: 0.875rem;
	}

	.report-success {
		color: #2ecc71;
		font-size: 0.875rem;
	}

	.report-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1100;
	}

	.report-modal {
		width: min(520px, 100%);
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 1rem;
	}

	.report-modal-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.report-close {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-primary);
		width: 2rem;
		height: 2rem;
		cursor: pointer;
	}

	.report-toast {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 1200;
		background: #2ecc71;
		color: #fff;
		padding: 0.65rem 0.9rem;
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-md);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.related-listings {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}

	.related-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 1rem;
		letter-spacing: -0.01em;
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
