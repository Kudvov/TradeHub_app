<script lang="ts">
	import './PeriodSelect.css';
	import { _ } from 'svelte-i18n';
	import type { ListingPeriodSlug } from '$lib/listing-period';

	let {
		activePeriod = '',
		onSelect
	}: {
		activePeriod?: ListingPeriodSlug;
		onSelect?: (slug: ListingPeriodSlug) => void;
	} = $props();

	type PeriodOption = { value: ListingPeriodSlug; key: string };

	const options: PeriodOption[] = [
		{ value: '', key: 'period_all' },
		{ value: 'today', key: 'period_today' },
		{ value: 'yesterday', key: 'period_yesterday' },
		{ value: 'week', key: 'period_week' },
		{ value: 'month', key: 'period_month' }
	];

	function handleChange(e: Event) {
		const v = (e.currentTarget as HTMLSelectElement).value;
		onSelect?.((v === '' ? '' : v) as ListingPeriodSlug);
	}
</script>

<div class="period-select-field">
	<select
		id="listing-period-select"
		class="period-select"
		value={activePeriod}
		onchange={handleChange}
		aria-label="Период публикации"
	>
		{#each options as opt (opt.value === '' ? 'all' : opt.value)}
			<option value={opt.value}>{$_(opt.key)}</option>
		{/each}
	</select>
</div>
