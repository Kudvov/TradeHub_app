# Parser Pipeline

Backlinks: [[README]] [[02-Architecture/System-Architecture]] [[06-Incidents/Image-Links-Rotation]] [[06-Incidents/Deduplication]]

## Main scripts
- `npm run parser:sync` → incremental/initial Telegram sync.
- `npm run parser:refresh-images` → refreshes image URLs for recent listings.
- `npm run parser:reparse` → recategorization/filter refresh.
- `npm run parser:cleanup-duplicates` → find duplicate `contentHash` per city; dry-run or `APPLY=1` to mark extras `filtered` and merge data into keeper.
- `npm run parser:ai-reclassify` → re-run AI category classification on all listings via Ollama (qwen2.5:3b). CPU-heavy: runs with `CPUQuota=300%` on server.
- `npm run parser:translate` → translate untranslated listings to EN/KA via Claude Haiku API. Batches of 20, skips already-translated. Needs `ANTHROPIC_API_KEY` in `.env`.

## Pipeline stages
1. Determine source group + message range.
2. Fetch Telegram embed page with retries/timeouts.
3. Parse text + media + author + date.
4. Extract normalized fields (price/contact/category).
5. AI classify category (Ollama, qwen2.5:3b).
6. Deduplicate: same post = `telegramGroupId` + `telegramMessageId`; same text in city = `cityId` + `contentHash` among `active` (blocks cross-group duplicates).
7. Insert/update listing records.
8. Update city counters.
9. Refresh recent image URLs (post-sync).

## Translation pipeline (separate run)
- Script: `src/lib/server/telegram/translate-listings.ts`
- Model: `claude-haiku-4-5` via Anthropic SDK
- Input: Russian title + description
- Output: `title_en`, `description_en`, `title_ka`, `description_ka`
- Batch size: 20 listings, `max_tokens: 2048`
- Skips rows where all four translation columns are already non-null
- Run after sync to keep translations fresh

## Current hardening points
- Fetch retries and timeout envs:
  - `PARSER_FETCH_RETRIES`
  - `PARSER_FETCH_TIMEOUT_MS`
  - `PARSER_FETCH_RETRY_BASE_MS`
- Image refresh envs:
  - `REFRESH_IMAGES_AFTER_SYNC`
  - `REFRESH_IMAGES_LIMIT`
  - `REFRESH_SLEEP_MS`

## Operator notes
- Keep refresh limits moderate to avoid overloading Telegram.
- Missing/non-listing outcomes are expected for deleted or non-text posts.
- `ai-reclassify` is a one-off operation after category changes — not part of regular sync.
- `translate` is incremental by default — safe to re-run; won't overwrite existing translations.
