<script lang="ts">
	import './Header.css';
	import BrandLogo from './BrandLogo.svelte';
	import PremiumAddListingCta from './PremiumAddListingCta.svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import { _ } from 'svelte-i18n';
	import type { PremiumCitySlug } from '$lib/premium-group';
	import { page } from '$app/stores';

	let {
		cities = []
	}: {
		cities: Array<{ id: number; name: string; slug: string; newCount: number; listingsCount?: number }>;
	} = $props();

	let currentSlug = $derived($page.url.pathname.split('/').filter(Boolean)[0] ?? '');
	const premiumCitySlug = $derived(
		currentSlug === 'batumi' || currentSlug === 'tbilisi' ? (currentSlug as PremiumCitySlug) : null
	);
</script>

<header class="header">
	<div class="container header-inner" class:header-inner--premium-cta={premiumCitySlug !== null}>
		<a href="/" class="logo" id="header-logo" aria-label="teleposter — главная">
			<BrandLogo height={34} />
		</a>

		<nav class="header-nav" id="header-nav" aria-label="Выбор города">
			{#each cities as city (city.id)}
				<a
					href="/{city.slug}"
					class="city-btn"
					class:city-btn--active={currentSlug === city.slug}
					aria-current={currentSlug === city.slug ? 'page' : undefined}
				>
					<span class="city-btn-text">{$_(`city_${city.slug}`) || city.name}</span>
					<span class="city-count" title="Активные объявления в ленте города">{(city.listingsCount ?? 0).toLocaleString('ru-RU')}</span>
					{#if city.newCount > 0}
						<span class="city-new">{$_('header_new_24h', { values: { count: city.newCount } })}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="header-lang">
			<LanguageSwitcher />
		</div>

		{#if premiumCitySlug}
			<div class="header-premium-cta">
				<PremiumAddListingCta citySlug={premiumCitySlug} />
			</div>
		{/if}
	</div>
</header>
