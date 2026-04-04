# 07. Структура проекта с GSD

Backlinks: [[README]]

## Типичное дерево
- `.claude/agents/`
- `.claude/commands/gsd/`
- `.claude/get-shit-done/`
- `.claude/settings.json`
- `.planning/`
- `PROJECT.md`
- `CLAUDE.md`
- `src/`

## Два уровня конфигурации
- Глобальный: `~/.claude/`.
- Локальный: `./.claude/`.

Локальный уровень имеет приоритет при совпадении файлов.
