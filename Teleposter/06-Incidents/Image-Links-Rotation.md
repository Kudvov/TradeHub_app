# Incident: Telegram Image URL Expiration

Backlinks: [[README]] [[03-Backend/Parser-Pipeline]] [[03-Backend/Operations-Runbook]]

## Symptom
Listing pages show broken images over time even when listing text remains valid.

## Root cause
Telegram embed-derived image URLs are not guaranteed permanent and may expire or become inaccessible.

## Mitigation implemented
1. Added manual image refresh script (`parser:refresh-images`).
2. Added automatic post-sync image refresh in parser pipeline.
3. Improved scraper resilience:
   - fetch retry + timeout,
   - richer image URL extraction (`style`, `src`, `srcset`).

## Runbook
- Trigger manual refresh with custom window:
  - `REFRESH_IMAGES_LIMIT=300 npm run parser:refresh-images`
- Verify updated/unchanged counts in output.

## Long-term option
Store copied images in owned storage (S3/disk CDN) to eliminate dependency on expiring Telegram URLs.
