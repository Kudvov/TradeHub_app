<script lang="ts">
	import { _ } from 'svelte-i18n';

	let {
		priceMin = null,
		priceMax = null,
		onFilter
	}: {
		priceMin: number | null;
		priceMax: number | null;
		onFilter: (min: number | null, max: number | null) => void;
	} = $props();

	let minVal = $state<number | ''>(priceMin ?? '');
	let maxVal = $state<number | ''>(priceMax ?? '');

	$effect(() => {
		minVal = priceMin ?? '';
		maxVal = priceMax ?? '';
	});

	function apply() {
		const min = minVal !== '' ? Number(minVal) : null;
		const max = maxVal !== '' ? Number(maxVal) : null;
		if ((min !== null && isNaN(min)) || (max !== null && isNaN(max))) return;
		onFilter(min, max);
	}

	function reset() {
		minVal = '';
		maxVal = '';
		onFilter(null, null);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') apply();
	}

	const hasFilter = $derived(priceMin !== null || priceMax !== null);
</script>

<div class="price-filter">
	<div class="price-filter-inputs">
		<input
			class="price-input"
			type="number"
			min="0"
			step="1"
			placeholder={$_('price_from')}
			bind:value={minVal}
			onkeydown={handleKeydown}
			aria-label={$_('price_from')}
		/>
		<span class="price-sep">—</span>
		<input
			class="price-input"
			type="number"
			min="0"
			step="1"
			placeholder={$_('price_to')}
			bind:value={maxVal}
			onkeydown={handleKeydown}
			aria-label={$_('price_to')}
		/>
		<button type="button" class="price-apply btn btn-sm btn-secondary" onclick={apply}>
			{$_('apply')}
		</button>
		{#if hasFilter}
			<button type="button" class="price-reset" onclick={reset} aria-label={$_('reset_filter')}>✕</button>
		{/if}
	</div>
</div>

<style>
	.price-filter {
		display: flex;
		align-items: center;
	}

	.price-filter-inputs {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.price-input {
		width: 90px;
		padding: 0.35rem 0.5rem;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		color: var(--text-primary);
		outline: none;
		-moz-appearance: textfield;
	}

	.price-input::-webkit-outer-spin-button,
	.price-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	.price-input:focus {
		border-color: var(--accent);
	}

	.price-sep {
		color: var(--text-muted);
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.price-reset {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.875rem;
		padding: 0.25rem;
		line-height: 1;
		border-radius: var(--radius-sm);
	}

	.price-reset:hover {
		color: var(--text-primary);
		background: var(--bg-card-hover);
	}

	@media (max-width: 520px) {
		.price-input {
			width: 72px;
		}
	}
</style>
