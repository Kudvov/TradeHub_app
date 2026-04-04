# Frontend UI Structure

Backlinks: [[README]] [[01-Product/Overview]]

## Stack
- **SvelteKit** + Svelte 5 (runes: `$state`, `$derived`, `$effect`)
- **svelte-i18n** — UI localization (RU / EN / KA)
- **Drizzle ORM** — DB queries in server routes
- **@sveltejs/adapter-node** — Node production build

## Стили (CSS)
- **`src/app.css`** — глобальная тема (токены, утилиты: `.container`, `.btn`, `.grid-listings`, анимации).
- **Отдельные `.css` рядом со страницами/компонентами** — импорт из `<script>` (например `import './layout.css'`), без `<style>` внутри `.svelte`.
- Файлы: `routes/layout.css`, `routes/home.css`, `routes/[city]/city-page.css`, `routes/listing/[id]/listing-detail.css`, `routes/admin/groups/admin-groups.css`, `lib/components/*.css`.

## Main pages
- `/` — home with hero search.
- `/:city` — city feed with category + period filters, pagination.
- `/listing/:id` — listing detail page with gallery, translation toggle, CTA buttons, report modal.
- `/admin/groups` — admin groups management.

## Shared UI blocks
- **Header** — city selector + language switcher (`LanguageSwitcher.svelte`).
- **SearchBar** — sticky in layout for non-home pages.
- **SiteFooter** — reused across all pages.
- **ListingCard** — displays title/description in current locale, language badge (RU flag when locale ≠ ru), translated category and city names.
- **CategoryFilter**, **PeriodSelect** — translated filter labels.

## i18n System
- Library: `svelte-i18n` (`src/lib/i18n.ts`)
- Locales: `src/lib/locales/ru.json`, `en.json`, `ka.json` (~80 keys each)
- Locale stored in `localStorage` key `locale`; falls back to browser navigator locale, then `ru`.
- Usage: `$_('key')` in Svelte components; `{ values: { city: ... } }` for interpolation.
- Key naming: `cat_electronics`, `city_batumi`, `listing_contact`, `report_spam`, etc.

## Listing detail — translation toggle
- Shown only if `hasTranslation` is true (at least one EN or KA field is non-null).
- Default: show translation (`showTranslation = true`).
- Resets to translation view on locale change.
- Two buttons: «Перевод» / «Оригинал» (or locale-translated equivalents).
- `displayTitle` / `displayDescription` derived from locale + showTranslation state.
- Keys: `show_translation`, `show_original`, `translated_badge`.

## ListingCard — language badge
- Shows small RU flag badge (top-right of card) when locale is EN or KA.
- Badge is dimmed (opacity 0.45) if listing is not translated yet.
- Category name: `$_('cat_${cat.slug}')`, city name: `$_('city_${city.slug}')`.

## Format utilities (`src/lib/utils/format.ts`)
- `formatPrice(price, currency, locale)` — locale-aware number formatting.
- `formatDate(date, locale)` — relative time labels from locale strings (`date_just_now`, `date_minutes_ago`, etc.).

## UX details worth preserving
- Home hero positioning and transition behavior (view transition API).
- City selector visual style.
- Consistent footer on all pages.
- Mobile: `.detail-attrs` in listing detail stays in one row (city + source side by side) — fixed in `listing-detail.css` `@media (max-width: 520px)`.

## Potential UI risks
- Broken external image URLs impact listing/gallery UX.
- Large payloads can affect render speed on listing pages.
- `svelte-i18n` locale hydration: SSR always uses `ru`; client switches after hydration (no flash if locale = ru).
