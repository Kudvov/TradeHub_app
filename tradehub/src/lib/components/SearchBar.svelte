<script lang="ts">
	let {
		value = '',
		placeholder = 'Поиск объявлений...',
		onSearch
	}: {
		value?: string;
		placeholder?: string;
		onSearch?: (query: string) => void;
	} = $props();

	let inputValue = $state('');
	$effect(() => {
		inputValue = value;
	});

	function handleInput(e: Event) {
		inputValue = (e.target as HTMLInputElement).value;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSearch?.(inputValue.trim());
	}

	function handleClear() {
		inputValue = '';
		onSearch?.('');
	}
</script>

<form class="search-bar" onsubmit={handleSubmit} id="search-bar">
	<div class="search-icon">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	</div>
	<input
		type="text"
		class="search-input"
		{placeholder}
		value={inputValue}
		oninput={handleInput}
		id="search-input"
	/>
	{#if inputValue}
		<button type="button" class="search-clear" onclick={handleClear} id="search-clear" aria-label="Очистить поиск">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	{/if}
	<button type="submit" class="btn btn-primary search-submit" id="search-submit">Найти</button>
</form>

<style>
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0;
		background: var(--bg-input);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 0.125rem 0.125rem 0.125rem 0.875rem;
		transition: border-color var(--transition-fast);
		max-width: 640px;
		width: 100%;
	}

	.search-bar:focus-within {
		border-color: var(--text-muted);
		box-shadow: none;
	}

	.search-icon {
		color: var(--text-muted);
		flex-shrink: 0;
		display: flex;
	}

	.search-input {
		flex: 1;
		border: none;
		background: none;
		color: var(--text-primary);
		font-family: var(--font-sans);
		font-size: 0.9375rem;
		padding: 0.625rem 0.75rem;
		outline: none;
		min-width: 0;
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.search-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.search-clear:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.search-submit {
		flex-shrink: 0;
		border-radius: var(--radius-md);
		min-height: 40px;
	}
</style>
