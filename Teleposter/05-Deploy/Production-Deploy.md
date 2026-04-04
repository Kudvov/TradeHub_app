# Production Deploy

Backlinks: [[README]] [[03-Backend/Operations-Runbook]]

## Current deploy flow
- Local script packs project archive and uploads via SSH.
- Remote script extracts to `/opt/teleposter`, restores `.env`, installs deps, builds app, restarts services.

## Key scripts
- Local: `tradehub/scripts/deploy-to-server.sh`
- Remote: `tradehub/scripts/remote-deploy.sh`

## Environment expectations
- Valid DB URL in `.env`.
- Systemd units installed for app and parser timer.
- nginx configured to proxy app.

## Post-deploy verification
1. `teleposter.service` active.
2. `teleposter-parser.timer` active.
3. `http://127.0.0.1:3000/admin/groups` -> 200.
4. `http://127.0.0.1/admin/groups` (nginx) -> 200.

## Notes
- macOS tar xattr warnings are noisy but non-blocking.
- Keep deploy keys stable and non-interactive for automation.
