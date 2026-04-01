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
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
		/* glass */
		background: rgba(255, 255, 255, 0.42);
		backdrop-filter: blur(14px) saturate(1.2);
		-webkit-backdrop-filter: blur(14px) saturate(1.2);
		border: 1px solid rgba(255, 255, 255, 0.55);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 rgba(255, 255, 255, 0.65);
		border-radius: var(--radius-xl);
		padding: 0.25rem 0.25rem 0.25rem 1rem;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);
		max-width: 720px;
		width: 100%;
		min-height: 3.25rem;
	}

	:global(html.dark) .search-bar {
		background: rgba(28, 28, 28, 0.55);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.search-bar:focus-within {
		border-color: rgba(0, 0, 0, 0.14);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.06),
			var(--shadow-md),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	:global(html.dark) .search-bar:focus-within {
		border-color: rgba(255, 255, 255, 0.16);
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.06),
			var(--shadow-md),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
		font-size: 1.0625rem;
		line-height: 1.4;
		padding: 0.75rem 0.875rem;
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
		min-height: 2.875rem;
		padding-left: 1.25rem;
		padding-right: 1.25rem;
		font-size: 1rem;
	}
</style>
