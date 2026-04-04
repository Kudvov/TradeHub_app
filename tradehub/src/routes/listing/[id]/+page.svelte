<script lang="ts">
	import './listing-detail.css';
	import ListingCard from '$lib/components/ListingCard.svelte';
	import { formatPrice, formatDate, maskLinks } from '$lib/utils/format';
	import { getContactHref, isPhoneContact, isTelegramProfileHref } from '$lib/utils/contact';
	import { _, locale } from 'svelte-i18n';
	import { page } from '$app/stores';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	const listing = $derived(data.gone ? null : data.listing);

	// Есть ли перевод для текущей локали
	const hasTranslation = $derived.by(() => {
		if (!listing) return false;
		const loc = $locale ?? 'ru';
		if (loc === 'en') return !!listing.titleEn;
		if (loc === 'ka') return !!listing.titleKa;
		return false;
	});

	// Переключатель: по умолчанию показываем перевод если он есть
	let showTranslation = $state(true);

	// Сбрасываем на перевод при смене языка
	$effect(() => {
		$locale;
		showTranslation = true;
	});

	// Итоговые тексты для отображения
	const displayTitle = $derived.by(() => {
		const loc = $locale ?? 'ru';
		if (showTranslation && loc === 'en' && listing?.titleEn) return listing.titleEn;
		if (showTranslation && loc === 'ka' && listing?.titleKa) return listing.titleKa;
		return listing?.title ?? '';
	});

	const displayDescription = $derived.by(() => {
		const loc = $locale ?? 'ru';
		if (showTranslation && loc === 'en' && listing?.descriptionEn) return listing.descriptionEn;
		if (showTranslation && loc === 'ka' && listing?.descriptionKa) return listing.descriptionKa;
		return listing?.description ?? '';
	});

	const safeTitle = $derived(maskLinks(displayTitle));
	const safeDescription = $derived(displayDescription ? maskLinks(displayDescription) : '');

	// Перевод города и категории
	const cityName = $derived.by(() => {
		const slug = listing?.city?.slug;
		if (!slug) return listing?.city?.name ?? '';
		return $_((`city_${slug}`)) || listing?.city?.name || '';
	});
	const categoryName = $derived.by(() => {
		const slug = listing?.category?.slug;
		if (!slug) return listing?.category?.name ?? '';
		return $_((`cat_${slug}`)) || listing?.category?.name || '';
	});
	const relatedListings = $derived(data.relatedListings ?? []);
	const sellerContactHref = $derived(listing?.contact ? getContactHref(listing.contact) : '#');
	const groupHref = $derived.by(() => {
		const usernameRaw = listing?.telegramGroup?.username;
		if (!usernameRaw) return '#';
		const username = usernameRaw.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
		const messageId = listing?.telegramMessageId ? String(listing.telegramMessageId) : null;
		if (messageId) return `https://t.me/${username}/${messageId}`;
		return `https://t.me/${username}`;
	});
	const contactHref = $derived(sellerContactHref);
	const hasValidContactHref = $derived(contactHref !== '#');
	const canWriteSeller = $derived(isTelegramProfileHref(contactHref));
	const hasOpenPost = $derived(groupHref !== '#');
	const hasAuthorDm = $derived(canWriteSeller && hasValidContactHref);
	const showBothCtas = $derived(hasAuthorDm && hasOpenPost);

	const images: string[] = $derived(listing.images && listing.images.length > 0
		? listing.images
		: ['https://placehold.co/800x600/1a1a2e/6a6a7a?text=No+Photo']);

	let activeImage = $state(0);
	/** Узкий экран: свайп по основному фото */
	let isMobileGallery = $state(false);
	let isReportOpen = $state(false);
	let showReportToast = $state(false);

	let touchStartX = 0;
	let touchStartY = 0;

	function isPhone(contact: string): boolean {
		return isPhoneContact(contact);
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 767px)');
		const sync = () => {
			isMobileGallery = mq.matches;
		};
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	function onGalleryTouchStart(e: TouchEvent): void {
		if (!isMobileGallery || images.length <= 1) return;
		touchStartX = e.changedTouches[0].clientX;
		touchStartY = e.changedTouches[0].clientY;
	}

	function onGalleryTouchEnd(e: TouchEvent): void {
		if (!isMobileGallery || images.length <= 1) return;
		const x = e.changedTouches[0].clientX;
		const y = e.changedTouches[0].clientY;
		const dx = x - touchStartX;
		const dy = y - touchStartY;
		const minSwipe = 48;
		if (Math.abs(dx) < minSwipe) return;
		if (Math.abs(dy) > Math.abs(dx) * 1.15) return;
		if (dx < 0) showNextImage();
		else showPrevImage();
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
</script>

<svelte:head>
	{#if data.gone}
		<title>Объявление удалено | teleposter</title>
		<meta name="description" content="Это объявление больше не доступно. Посмотрите похожие." />
		<meta name="robots" content="noindex" />
	{:else}
		{@const ogTitle = `${safeTitle} — ${listing?.city?.name} | teleposter`}
		{@const ogDescription = safeDescription?.slice(0, 160) || safeTitle}
		{@const ogImage = images[0]?.startsWith('http') ? images[0] : `${$page.url.origin}/og-image.png`}
		{@const ogUrl = $page.url.href}
		<title>{ogTitle}</title>
		<meta name="description" content={ogDescription} />
		<link rel="canonical" href="{$page.url.origin}/listing/{listing?.id}" />
		<!-- hreflang -->
		<link rel="alternate" hreflang="ru" href="{$page.url.origin}/listing/{listing?.id}" />
		<link rel="alternate" hreflang="en" href="{$page.url.origin}/listing/{listing?.id}" />
		<link rel="alternate" hreflang="ka" href="{$page.url.origin}/listing/{listing?.id}" />
		<link rel="alternate" hreflang="x-default" href="{$page.url.origin}/listing/{listing?.id}" />
		<!-- Open Graph -->
		<meta property="og:type" content="product" />
		<meta property="og:site_name" content="teleposter" />
		<meta property="og:url" content={ogUrl} />
		<meta property="og:title" content={ogTitle} />
		<meta property="og:description" content={ogDescription} />
		<meta property="og:image" content={ogImage} />
		<meta property="og:locale" content="ru_RU" />
		<!-- Twitter Card -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={ogTitle} />
		<meta name="twitter:description" content={ogDescription} />
		<meta name="twitter:image" content={ogImage} />
		<!-- JSON-LD: Product + BreadcrumbList -->
		{@const jsonLdProduct = JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: listing?.title,
			description: listing?.description ?? undefined,
			image: images.filter((img) => img.startsWith('http')),
			url: ogUrl,
			offers: {
				'@type': 'Offer',
				priceCurrency: listing?.currency ?? 'USD',
				price: listing?.price ? parseFloat(listing.price) : undefined,
				availability: 'https://schema.org/InStock',
				url: ogUrl
			}
		})}
		{@const jsonLdBreadcrumb = JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Главная', item: $page.url.origin },
				...(listing?.city
					? [{ '@type': 'ListItem', position: 2, name: listing.city.name, item: `${$page.url.origin}/${listing.city.slug}` }]
					: []),
				{ '@type': 'ListItem', position: listing?.city ? 3 : 2, name: listing?.title, item: ogUrl }
			]
		})}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<script type="application/ld+json">${jsonLdProduct}</script>`}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<script type="application/ld+json">${jsonLdBreadcrumb}</script>`}
	{/if}
</svelte:head>

{#if data.gone}
	<section class="listing-detail">
		<div class="container">
			<nav class="breadcrumb fade-in">
				<a href="/">Главная</a>
				{#if data.city}
					<span class="sep">/</span>
					<a href="/{data.city.slug}">{data.city.name}</a>
				{/if}
			</nav>

			<div class="gone-wrap fade-in">
				<div class="gone-icon" aria-hidden="true">📭</div>
				<h1 class="gone-title">{$_('listing_unavailable_title')}</h1>
				<p class="gone-desc">{$_('listing_unavailable_desc')}</p>
				{#if data.city}
					<a href="/{data.city.slug}" class="btn btn-primary">
						{$_('listing_view_city', { values: { city: data.city.name } })}
					</a>
				{:else}
					<a href="/" class="btn btn-primary">{$_('listing_go_home')}</a>
				{/if}
			</div>

			{#if relatedListings.length > 0}
				<section class="related-listings fade-in">
					<h2 class="related-title">{$_('listing_similar')}</h2>
					<div class="grid-listings">
						{#each relatedListings as related (related.id)}
							<ListingCard listing={related} />
						{/each}
					</div>
				</section>
			{/if}
		</div>
	</section>
{:else}

<section class="listing-detail">
	<div class="container">
		<!-- Breadcrumb -->
		<nav class="breadcrumb fade-in" id="listing-breadcrumb">
			<a href="/">{$_('breadcrumb_home')}</a>
			<span class="sep">/</span>
			{#if listing?.city}
				<a href="/{listing.city.slug}">{cityName}</a>
				<span class="sep">/</span>
			{/if}
			<span class="current">{safeTitle}</span>
		</nav>

		<div class="detail-grid fade-in">
			<!-- Images -->
			<div class="detail-images" id="listing-images">
				{#if images.length > 1}
					<div
						class="main-image main-image--multi"
						class:main-image--gallery-mobile={isMobileGallery}
						role="group"
						aria-label={`Фото ${activeImage + 1} из ${images.length}. Левый и правый край — предыдущее и следующее${isMobileGallery ? '; свайп по фото влево или вправо' : ''}`}
						ontouchstart={onGalleryTouchStart}
						ontouchend={onGalleryTouchEnd}
					>
						<div class="main-image-frame">
							<img
								src={images[activeImage]}
								alt="{listing?.title} — фото {activeImage + 1}"
								draggable="false"
							/>
							{#if isMobileGallery}
								<span class="gallery-photo-counter" aria-hidden="true">
									{activeImage + 1} / {images.length}
								</span>
							{/if}
						</div>
						<button
							type="button"
							class="main-image-hit main-image-hit--prev"
							onclick={showPrevImage}
							aria-label="Предыдущее фото"
						></button>
						<button
							type="button"
							class="main-image-hit main-image-hit--next"
							onclick={showNextImage}
							aria-label="Следующее фото"
						></button>
					</div>
				{:else}
					<div class="main-image">
						<div class="main-image-frame main-image-frame--single">
							<img
								src={images[activeImage]}
								alt="{listing?.title} — фото {activeImage + 1}"
								draggable="false"
							/>
						</div>
					</div>
				{/if}
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
					<div class="detail-meta-left">
						<span class="detail-date text-muted text-sm">{formatDate(listing?.publishedAt, $locale ?? 'ru')}</span>
						{#if listing?.category}
							<span class="badge">{listing.category.icon} {categoryName}</span>
						{/if}
					</div>
					<button
						type="button"
						class="report-btn"
						onclick={openReport}
						aria-label={$_('report_title')}
					>
						<svg class="report-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<span class="report-btn-text">{$_('listing_report')}</span>
					</button>
				</div>

				<div class="detail-title-row">
					<h1 class="detail-title">{safeTitle}</h1>
					{#if hasTranslation}
						<div class="translation-toggle">
							<button
								type="button"
								class="translation-btn"
								class:active={showTranslation}
								onclick={() => (showTranslation = true)}
							>
								{$_('show_translation')}
							</button>
							<button
								type="button"
								class="translation-btn"
								class:active={!showTranslation}
								onclick={() => (showTranslation = false)}
							>
								{$_('show_original')}
							</button>
						</div>
					{/if}
				</div>

				<div class="detail-price-block">
					<span class="detail-price">{formatPrice(listing?.price, listing?.currency, $locale ?? 'ru')}</span>
				</div>

				{#if displayDescription}
					<div class="detail-description">
						<h3 class="detail-section-title">{$_('listing_description')}</h3>
						<p>{safeDescription}</p>
					</div>
				{/if}

				<div class="detail-attrs">
					{#if listing?.city}
						<div class="attr attr--city">
							<span class="attr-heading">{$_('listing_city')}</span>
							<span class="attr-value">{cityName}</span>
						</div>
					{/if}
					{#if groupHref !== '#'}
						<div class="attr attr--group">
							<span class="attr-heading">{$_('listing_source')}</span>
							<a
								href={groupHref}
								target="_blank"
								rel="noopener"
								class="attr-value contact-link"
							>
								{listing?.telegramGroup?.title ?? listing?.telegramGroup?.username}
							</a>
						</div>
					{/if}
				</div>

				{#if hasAuthorDm || hasOpenPost}
					<div class="listing-cta-row" class:listing-cta-row--single={!showBothCtas}>
						{#if hasAuthorDm}
							<a
								href={contactHref}
								target={hasValidContactHref ? '_blank' : undefined}
								rel={hasValidContactHref ? 'noopener' : undefined}
								class="btn-cta btn-cta-primary"
								class:disabled={!hasValidContactHref}
								aria-disabled={!hasValidContactHref}
								tabindex={hasValidContactHref ? undefined : -1}
								id="contact-seller-btn"
							>
								<span>{$_('listing_contact')}</span>
								<svg
									class="btn-cta-tg-icon"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
									/>
								</svg>
							</a>
						{/if}
						{#if hasOpenPost}
							<a
								href={groupHref}
								target="_blank"
								rel="noopener noreferrer"
								class="btn-cta"
								class:btn-cta-primary={!hasAuthorDm}
								class:btn-cta-secondary={hasAuthorDm}
								id="open-listing-btn"
							>
								{$_('listing_open')}
							</a>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		{#if relatedListings.length > 0}
			<section class="related-listings fade-in" id="related-listings">
				<h2 class="related-title">{$_('listing_similar')}</h2>
				<div class="grid-listings">
					{#each relatedListings as related (related.id)}
						<ListingCard listing={related} />
					{/each}
				</div>
			</section>
		{/if}
	</div>
</section>

{/if}

{#if isReportOpen}
	<div class="report-overlay" role="dialog" aria-modal="true" aria-label={$_('report_title')} onclick={closeReport}>
		<div class="report-modal" onclick={(e) => e.stopPropagation()}>
			<div class="report-modal-head">
				<h3>{$_('report_title')}</h3>
				<button type="button" class="report-close" onclick={closeReport} aria-label={$_('close')}>✕</button>
			</div>
			<form method="POST" action="?/report" class="report-form">
				<select name="reason" required class="report-select">
					<option value="">{$_('report_choose')}</option>
					<option value="spam">{$_('report_spam')}</option>
					<option value="fraud">{$_('report_fraud')}</option>
					<option value="prohibited">{$_('report_prohibited')}</option>
					<option value="duplicate">{$_('report_duplicate')}</option>
					<option value="other">{$_('report_other')}</option>
				</select>
				<textarea name="details" rows="3" placeholder={$_('report_comment')} class="report-textarea"></textarea>
				<button class="btn btn-secondary" type="submit">{$_('report_submit')}</button>
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
		{$_('report_sent')}
	</div>
{/if}
