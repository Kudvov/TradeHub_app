<script lang="ts">
	import './PremiumAddListingCta.css';
	import { portal } from '$lib/actions/portal';
	import { premiumConfigForCitySlug, type PremiumCitySlug } from '$lib/premium-group';
	import { _ } from 'svelte-i18n';

	let { citySlug }: { citySlug: PremiumCitySlug } = $props();

	const CITY_LABEL: Record<PremiumCitySlug, string> = { batumi: 'Батуми', tbilisi: 'Тбилиси' };

	const cfg = $derived(premiumConfigForCitySlug(citySlug)!);
	const cityLabel = $derived(CITY_LABEL[citySlug]);

	let open = $state(false);

	function close(): void {
		open = false;
	}

	function goToGroup(): void {
		window.open(cfg.url, '_blank', 'noopener,noreferrer');
		close();
	}

	function handleWindowKeydown(e: KeyboardEvent): void {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="premium-add-cta">
	<button type="button" class="premium-add-btn" onclick={() => (open = true)}>
		{$_('add_listing')}
	</button>
</div>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="premium-add-overlay" role="presentation" use:portal onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="premium-add-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="premium-add-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="premium-add-modal-head">
				<h2 id="premium-add-title" class="premium-add-title">{$_('publish_in_telegram')}</h2>
				<button type="button" class="premium-add-close" onclick={close} aria-label={$_('close')}>✕</button>
			</div>
			<div class="premium-add-body">
				<p>
					На сайте у объявлений из группы <strong>@{cfg.username}</strong> — <strong>светлая жёлтая обводка</strong>
					вокруг карточки; такие посты показываются выше остальных в ленте {cityLabel}.
				</p>
				<p class="premium-add-note">
					Чтобы разместить объявление, зайди в эту группу в Telegram и опубликуй пост по правилам — после синхронизации оно появится здесь с такой же обводкой.
				</p>
			</div>
			<div class="premium-add-actions">
				<button type="button" class="btn btn-secondary" onclick={close}>{$_('close')}</button>
				<button type="button" class="btn btn-primary" onclick={goToGroup}>{$_('go_to_group')}</button>
			</div>
		</div>
	</div>
{/if}
