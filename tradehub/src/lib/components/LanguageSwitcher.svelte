<script lang="ts">
  import { locale } from 'svelte-i18n';
  import { browser } from '$app/environment';

  const locales = ['ru', 'en', 'ka'] as const;

  function setLocale(l: string) {
    locale.set(l);
    if (browser) localStorage.setItem('locale', l);
  }
</script>

<div class="lang-switcher">
  {#each locales as l}
    <button
      class="lang-btn"
      class:active={$locale === l}
      onclick={() => setLocale(l)}
    >
      {l.toUpperCase()}
    </button>
  {/each}
</div>

<style>
  .lang-switcher {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .lang-btn {
    padding: 2px 7px;
    border-radius: 5px;
    border: 1px solid transparent;
    background: none;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--color-text-secondary, #888);
    transition: all 0.15s;
    letter-spacing: 0.03em;
  }
  .lang-btn:hover {
    color: var(--color-text, #111);
    border-color: var(--color-border, #ddd);
  }
  .lang-btn.active {
    color: var(--color-text, #111);
    border-color: var(--color-border, #ddd);
    background: var(--color-surface, #f5f5f5);
  }
</style>
