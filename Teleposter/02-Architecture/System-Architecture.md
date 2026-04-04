# System Architecture

Backlinks: [[README]] [[03-Backend/Parser-Pipeline]] [[05-Deploy/Production-Deploy]]

## High-level components
1. **Telegram scraper/parsers** (Node + tsx scripts)
2. **PostgreSQL** (listings, groups, categories, reports)
3. **SvelteKit app** (public UI + admin pages)
4. **systemd services/timers** (app and parser scheduling)
5. **nginx** reverse proxy in production
6. **Ollama** (local LLM — qwen2.5:3b) — AI category classification
7. **Anthropic Claude Haiku API** — EN/KA translations for listings

## Data flow
1. Parser reads Telegram embed pages.
2. Extractor normalizes title/description/price/contact/category.
3. AI classifier (Ollama/qwen2.5:3b) assigns category to each listing.
4. Data stored in `listings` with relation to `telegram_groups` and `cities`.
5. Translation script (Claude Haiku) fills `title_en/description_en/title_ka/description_ka`.
6. Frontend reads from DB via SvelteKit server routes, serves content in user's locale.
7. User opens listing; app links back to Telegram origin.

## Multilingual system
- UI strings: `svelte-i18n` with RU/EN/KA locale JSONs (`src/lib/locales/`).
- Locale stored in `localStorage`, key `locale`.
- Listing content: DB fields per language, fallback to RU.
- Language switcher: `LanguageSwitcher.svelte` in Header.
- Listing detail: translation toggle (Перевод / Оригинал) — shown only if translation exists.

## Key reliability mechanisms
- Duplicate detection by `content_hash` per group.
- Cursor-based sync by `lastMessageId`.
- Retry/timeout in scraper fetch.
- Post-sync image refresh to repair expired image URLs.

## Known weak spots
- Telegram HTML structure can change.
- External image URLs may expire.
- Heuristic parsing can misclassify content.
- Ollama CPU usage spikes during reclassify runs (limited to 3 cores via systemd `CPUQuota=300%`).
- Anthropic API key has usage limits — monitor credits before translate runs.
