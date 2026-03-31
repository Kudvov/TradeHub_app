<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>TradeHub — Объявления из Telegram</title>
</svelte:head>

<Header />

<main class="main-content">
	{@render children()}
</main>

<footer class="footer">
	<div class="container footer-inner">
		<div class="footer-brand">
			<span class="footer-logo">⚡ Trade<span class="text-gradient">Hub</span></span>
			<p class="text-sm text-muted">Объявления из Telegram-барахолок</p>
		</div>
		<div class="footer-links">
			{#each data.cities as city (city.id)}
				<a href="/{city.slug}" class="footer-link">{city.name}</a>
			{/each}
		</div>
		<p class="footer-copy text-xs text-muted">© {new Date().getFullYear()} TradeHub. Данные из открытых Telegram-групп.</p>
	</div>
</footer>

<style>
	.main-content {
		position: relative;
		z-index: 1;
		min-height: calc(100dvh - 64px - 200px);
	}

	.footer {
		position: relative;
		z-index: 1;
		margin-top: 4rem;
		padding: 2.5rem 0;
		border-top: 1px solid var(--border);
		background: var(--bg-secondary);
	}

	.footer-inner {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		text-align: center;
	}

	.footer-logo {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.footer-link {
		font-size: 0.875rem;
		color: var(--text-secondary);
		transition: color var(--transition-fast);
	}

	.footer-link:hover {
		color: var(--accent);
	}

	.footer-copy {
		padding-top: 0.5rem;
	}
</style>
