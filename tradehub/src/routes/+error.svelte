<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	const status = $derived($page.status);
	const is503 = $derived(status === 503 || status === 502 || status === 504);
	const is404 = $derived(status === 404);
	const is500 = $derived(status === 500);
	const pageTitle = $derived(
		is503 ? $_('error_503_title')
		: is404 ? $_('error_404_title')
		: `Ошибка ${status}`
	);
</script>

<svelte:head>
	<title>{pageTitle} | teleposter</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="error-page">
	<div class="error-inner">
		{#if is503}
			<div class="error-icon" aria-hidden="true">🔧</div>
			<h1 class="error-title">{$_('error_503_title')}</h1>
			<p class="error-desc">{$_('error_503_desc')}</p>
			<button class="btn-error" onclick={() => location.reload()}>
				{$_('error_503_btn')}
			</button>
		{:else if is404}
			<div class="error-icon" aria-hidden="true">🔍</div>
			<h1 class="error-title">{$_('error_404_title')}</h1>
			<p class="error-desc">{$_('error_404_desc')}</p>
			<a href="/" class="btn-error">{$_('go_home')}</a>
		{:else if is500}
			<div class="error-icon" aria-hidden="true">⚙️</div>
			<h1 class="error-title">{$_('error_500_title')}</h1>
			<p class="error-desc">{$_('error_500_desc')}</p>
			<a href="/" class="btn-error">{$_('go_home')}</a>
		{:else}
			<div class="error-icon" aria-hidden="true">😕</div>
			<h1 class="error-title">Ошибка {status}</h1>
			<p class="error-desc">{$page.error?.message ?? $_('error_500_desc')}</p>
			<a href="/" class="btn-error">{$_('go_home')}</a>
		{/if}

		<p class="error-code">Код ошибки: {status}</p>
	</div>
</section>

<style>
	.error-page {
		min-height: calc(100dvh - 64px - 3.5rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.error-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1rem;
		max-width: 28rem;
	}

	.error-icon {
		font-size: 4rem;
		line-height: 1;
	}

	.error-title {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin: 0;
	}

	.error-desc {
		font-size: 1rem;
		color: var(--text-secondary);
		line-height: 1.65;
		margin: 0;
	}

	.btn-error {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.5rem;
		padding: 0.625rem 1.5rem;
		background: var(--accent);
		color: var(--bg-secondary);
		border: none;
		border-radius: var(--radius-md);
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		transition: background var(--transition-fast);
		min-height: 44px;
	}

	.btn-error:hover {
		background: var(--accent-hover);
		color: var(--bg-secondary);
	}

	.error-code {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0.5rem 0 0;
	}

	@media (max-width: 480px) {
		.error-title {
			font-size: 1.375rem;
		}
	}
</style>
