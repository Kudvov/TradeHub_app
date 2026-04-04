# Product Overview

Backlinks: [[README]] [[04-Frontend/UI-Structure]] [[03-Backend/Parser-Pipeline]]

## What Teleposter is
A multilingual classifieds-style web app that surfaces posts from Telegram groups and presents them as structured listings by city and category. Available in Russian, English, and Georgian.

## Primary user flows
1. Home page search → city page with filters.
2. Browse categories/cities quickly.
3. Open listing details and contact seller via Telegram.
4. Switch interface language (RU/EN/KA) and read listing in preferred language.

## Value proposition
- Removes noise from Telegram chat streams.
- Provides fast search + category filtering.
- Keeps source transparency via links back to Telegram post/group.
- Multilingual: UI and listing content available in RU, EN, KA.

## Product constraints
- Source data quality depends on Telegram post structure.
- Image links from Telegram can expire and need refresh workflow.
- Deduplication/categorization are heuristic, not perfect.
- Translations are AI-generated (Claude Haiku) — quality good but not perfect.
- Translation coverage is incremental — not all listings may be translated yet.

## Success criteria
- Fast listing retrieval and stable parser sync.
- Low broken-image rate.
- Reliable daily operations without manual firefighting.
- High translation coverage for active listings.
