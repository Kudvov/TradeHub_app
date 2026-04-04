<script lang="ts">
	import './ListingCard.css';
	import { formatPrice, formatDate, maskLinks, truncate } from '$lib/utils/format';
	import { isPremiumListing } from '$lib/premium-group';
	import { _, locale } from 'svelte-i18n';
	import type { Listing, Category, City, TelegramGroup } from '$lib/types';

	type ListingData = Listing & {
		city?: City | null;
		category?: Category | null;
		telegramGroup?: TelegramGroup | null;
	};
	let { listing }: { listing: ListingData } = $props();

	const premium = $derived(isPremiumListing(listing));

	const imageUrl = $derived(listing.images && listing.images.length > 0
		? listing.images[0]
		: 'https://placehold.co/400x300/1a1a2e/6a6a7a?text=No+Photo');

	// Показываем переведённый заголовок если доступен
	const displayTitle = $derived.by(() => {
		const loc = $locale ?? 'ru';
		if (loc === 'en' && listing.titleEn) return listing.titleEn;
		if (loc === 'ka' && listing.titleKa) return listing.titleKa;
		return listing.title;
	});

	const displayDescription = $derived.by(() => {
		const loc = $locale ?? 'ru';
		if (loc === 'en' && listing.descriptionEn) return listing.descriptionEn;
		if (loc === 'ka' && listing.descriptionKa) return listing.descriptionKa;
		return listing.description ?? '';
	});

	const safeTitle = $derived(maskLinks(displayTitle));
	const safeDescription = $derived(displayDescription ? maskLinks(displayDescription) : '');

	// Название категории через i18n (slug → ключ)
	const categoryName = $derived.by(() => {
		const slug = listing.category?.slug;
		if (!slug) return listing.category?.name ?? '';
		const key = `cat_${slug}` as const;
		return $_(key) || listing.category?.name || '';
	});

	// Название города через i18n
	const cityName = $derived.by(() => {
		const slug = listing.city?.slug;
		if (!slug) return listing.city?.name ?? '';
		return $_((`city_${slug}`)) || listing.city?.name || '';
	});

	// Бейдж языка оригинала: показываем если смотрим не на русском
	const showLangBadge = $derived(($locale ?? 'ru') !== 'ru');
	// Если перевод ещё не готов — показываем оригинал с пометкой RU
	const isTranslated = $derived.by(() => {
		const loc = $locale ?? 'ru';
		if (loc === 'en') return !!listing.titleEn;
		if (loc === 'ka') return !!listing.titleKa;
		return true;
	});
</script>

<div class={premium ? 'listing-card-premium-host' : 'listing-card-slot'}>
	<a
		href="/listing/{listing.id}"
		class="listing-card card"
		class:premium-gradient-border={premium}
		id="listing-{listing.id}"
	>
		<div class="card-image">
			<img src={imageUrl} alt={listing.title} loading="lazy" />
			{#if listing.category}
				<span class="card-category">{categoryName}</span>
			{/if}
			{#if showLangBadge}
				<span class="card-lang-badge" class:card-lang-badge--untranslated={!isTranslated}>
					RU
				</span>
			{/if}
		</div>
		<div class="card-body">
			<h3 class="card-title">{truncate(safeTitle, 60)}</h3>
			{#if displayDescription}
				<p class="card-description">{truncate(safeDescription, 90)}</p>
			{/if}
			<div class="card-footer">
				<span class="card-price">{formatPrice(listing.price, listing.currency, $locale ?? 'ru')}</span>
				<span class="card-meta">
					{#if listing.city}
						<span class="card-city">{cityName}</span>
					{/if}
					<span class="card-time">{formatDate(listing.publishedAt, $locale ?? 'ru')}</span>
				</span>
			</div>
		</div>
	</a>
</div>
