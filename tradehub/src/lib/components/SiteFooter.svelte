<script lang="ts">
	import './SiteFooter.css';
	import BrandLogo from './BrandLogo.svelte';

	let {
		cities = []
	}: {
		cities: Array<{ id: number; name: string; slug: string }>;
	} = $props();

	const year = new Date().getFullYear();
</script>

<footer class="footer-home">
	<div class="container footer-home-inner">
		<a href="/" class="footer-home-logo" aria-label="teleposter — главная">
			<BrandLogo height={20} />
		</a>
		<span class="footer-home-sep" aria-hidden="true">·</span>
		<span class="footer-home-copy">© {year} teleposter</span>
		<span class="footer-home-sep" aria-hidden="true">·</span>
		{#each cities as city, i (city.id)}
			<a href="/{city.slug}" class="footer-home-link">{city.name}</a>{#if i < cities.length - 1}<span class="footer-home-sep" aria-hidden="true">·</span>{/if}
		{/each}
	</div>
</footer>
