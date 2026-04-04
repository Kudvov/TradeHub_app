# Operations Runbook

Backlinks: [[README]] [[05-Deploy/Production-Deploy]] [[03-Backend/Parser-Pipeline]]

## Daily checks
1. `teleposter.service` is active.
2. `teleposter-parser.timer` is active.
3. `GET /admin/groups` returns 200.

## Common commands (on server)
```bash
# App
systemctl restart teleposter.service
systemctl status teleposter.service

# Parser
systemctl restart teleposter-parser.timer
cd /opt/teleposter && npm run parser:sync

# Images
cd /opt/teleposter && npm run parser:refresh-images
REFRESH_IMAGES_LIMIT=300 npm run parser:refresh-images  # wider window

# Duplicates
cd /opt/teleposter && npm run parser:cleanup-duplicates        # dry-run
cd /opt/teleposter && APPLY=1 npm run parser:cleanup-duplicates  # apply

# AI reclassify (CPU-heavy, ~400% CPU, watch via htop)
cd /opt/teleposter && npm run parser:ai-reclassify

# Translate listings to EN/KA (needs ANTHROPIC_API_KEY in .env)
cd /opt/teleposter && npm run parser:translate
```

## If images are broken
1. Run `npm run parser:refresh-images`.
2. Increase `REFRESH_IMAGES_LIMIT` temporarily.
3. Re-check affected listing pages.

## If translations are missing
1. Check `ANTHROPIC_API_KEY` is set in `/opt/teleposter/.env`.
2. Run `npm run parser:translate` — incremental, safe to repeat.
3. Monitor output for batch progress and any API errors.

## If Ollama is using too much CPU
1. Check: `systemctl status ollama` and `htop`.
2. Verify CPUQuota is set: `systemctl show ollama | grep CPUQuota` → should be `300%`.
3. If not set: `systemctl edit ollama` → add `[Service]\nCPUQuota=300%` → `systemctl daemon-reload && systemctl restart ollama`.

## Safe troubleshooting order
1. Confirm DB/env availability.
2. Confirm parser timer/service health.
3. Check latest parser logs: `journalctl -u teleposter -n 100`.
4. Run targeted manual refresh/reparse.

## Do not do
- Do not reset listing IDs.
- Do not delete production `.env`.
- Do not force destructive DB operations without backup.
- Do not run `ai-reclassify` during peak hours — it saturates CPU.
