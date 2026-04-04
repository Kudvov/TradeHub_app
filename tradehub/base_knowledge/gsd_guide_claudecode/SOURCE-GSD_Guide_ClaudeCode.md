# SOURCE: GSD_Guide_ClaudeCode.pdf

Источник: `/Users/kudvov/Downloads/GSD_Guide_ClaudeCode.pdf`

Связанные заметки:
- [[README]]
- [[01-Что-такое-GSD]]
- [[02-Перед-установкой]]
- [[03-Установка-GSD]]
- [[04-Новый-проект-с-нуля]]
- [[05-Существующий-проект]]
- [[06-Команды-GSD]]
- [[07-Структура-проекта-с-GSD]]
- [[08-Автоматизация-и-удаление]]
- [[09-FAQ-и-ссылки]]

## Извлеченный текст (краткая опорная версия)

- GSD — система контекст-инжиниринга и spec-driven разработки для Claude Code.
- Основная проблема: context rot (деградация качества кода при росте контекста).
- Что дает: структурирование проекта, планирование фаз, автономное исполнение, верификация, сохранение контекста.
- Установка:
  - `npx get-shit-done-cc --claude --global`
  - `npx get-shit-done-cc --claude --local`
- Базовый поток:
  1) `/gsd:new-project`
  2) `/gsd:plan-phase N`
  3) `/gsd:execute-plan`
- Для существующего проекта:
  - `/gsd:map-codebase`
  - `/gsd:new-milestone`
  - или быстрый путь `/gsd:quick`
- Важные команды управления:
  - `/gsd:help`
  - `/gsd:settings`
  - `/gsd:health`
  - `/gsd:health --repair`
- Структура с GSD:
  - `.claude/agents`
  - `.claude/commands/gsd`
  - `.claude/get-shit-done`
  - `.planning`
  - `PROJECT.md`, `CLAUDE.md`
- Удаление:
  - `npx get-shit-done-cc --claude --global --uninstall`
  - `npx get-shit-done-cc --claude --local --uninstall`

## Примечание
Если нужно хранить сам бинарный PDF внутри базы знаний, положи файл в `assets/` рядом с этим документом, и я добавлю прямую ссылку вида `[[assets/GSD_Guide_ClaudeCode.pdf]]`.
