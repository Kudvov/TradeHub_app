<script lang="ts">
	import './SearchBar.css';
	import { _ } from 'svelte-i18n';
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
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
		<button type="button" class="search-clear" onclick={handleClear} id="search-clear" aria-label={$_('search_clear')}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	{/if}
	<button type="submit" class="btn btn-primary search-submit" id="search-submit">{$_('search_submit')}</button>
</form>
