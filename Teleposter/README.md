# Teleposter — Project Hub

## Quick Links
- [[01-Product/Overview]]
- [[02-Architecture/System-Architecture]]
- [[02-Architecture/Data-Model]]
- [[03-Backend/Parser-Pipeline]]
- [[03-Backend/Operations-Runbook]]
- [[04-Frontend/UI-Structure]]
- [[05-Deploy/Production-Deploy]]
- [[06-Incidents/Image-Links-Rotation]]
- [[06-Incidents/Deduplication]]
- [[99-Changelog/2026-04]]

## Project Snapshot
Teleposter aggregates listings from Telegram groups, normalizes and categorizes them, stores them in PostgreSQL, and serves a public SvelteKit site.

## Core Goals
1. Keep listing feed fresh and searchable.
2. Keep parser stable under Telegram edge cases.
3. Keep production deploy repeatable and safe.
4. Preserve operational knowledge in one place.

## How to use this knowledge base
- Start from [[README]] and follow links by domain.
- Use runbooks for operational tasks.
- Log all notable changes in [[99-Changelog/2026-04]].

## Recommended maintenance routine
- After each infra or parser change: update the relevant doc + changelog.
- After incidents: add a note in [[06-Incidents/Image-Links-Rotation]], [[06-Incidents/Deduplication]], or create a sibling incident doc.
