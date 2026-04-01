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
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
		width: 100%;
		max-width: none;
		min-height: 3.5rem;
		/* glass, чуть заметнее */
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(16px) saturate(1.25);
		-webkit-backdrop-filter: blur(16px) saturate(1.25);
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.07),
			0 1px 3px rgba(0, 0, 0, 0.04),
			inset 0 1px 0 rgba(255, 255, 255, 0.75);
		border-radius: var(--radius-xl);
		padding: 0.35rem 0.35rem 0.35rem 1.125rem;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	:global(html.dark) .search-bar {
		background: rgba(32, 32, 32, 0.72);
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow:
			0 2px 16px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.search-bar:focus-within {
		border-color: rgba(0, 0, 0, 0.18);
		box-shadow:
			0 0 0 2px rgba(0, 0, 0, 0.05),
			0 4px 20px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.55);
	}

	:global(html.dark) .search-bar:focus-within {
		border-color: rgba(255, 255, 255, 0.22);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.06),
			0 4px 24px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.search-icon {
		color: var(--text-muted);
		flex-shrink: 0;
		display: flex;
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-family: var(--font-sans);
		font-size: 1.125rem;
		line-height: 1.4;
		padding: 0.85rem 1rem;
		outline: none;
		min-width: 0;
		-webkit-tap-highlight-color: transparent;
		caret-color: var(--text-primary);
	}

	/* убрать «синее» выделение текста (selection) */
	.search-input::selection {
		background: rgba(0, 0, 0, 0.1);
		color: inherit;
	}

	:global(html.dark) .search-input::selection {
		background: rgba(255, 255, 255, 0.14);
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	/* Chrome autofill — без голубого фона (перекрытие inset-тенью под стекло) */
	.search-input:-webkit-autofill,
	.search-input:-webkit-autofill:hover,
	.search-input:-webkit-autofill:focus {
		-webkit-text-fill-color: var(--text-primary);
		caret-color: var(--text-primary);
		transition: background-color 99999s ease-out;
		box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.35) inset !important;
	}

	:global(html.dark) .search-input:-webkit-autofill,
	:global(html.dark) .search-input:-webkit-autofill:hover,
	:global(html.dark) .search-input:-webkit-autofill:focus {
		box-shadow: 0 0 0 1000px rgba(24, 24, 24, 0.65) inset !important;
	}

	.search-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.search-clear:hover {
		background: rgba(0, 0, 0, 0.06);
		color: var(--text-primary);
	}

	:global(html.dark) .search-clear:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.search-submit {
		flex-shrink: 0;
		border-radius: var(--radius-lg);
		min-height: 3rem;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
		font-size: 1.0625rem;
		font-weight: 600;
	}
</style>
