# Contributing Guide

Этот репозиторий использует flow:

- `master` -> стабильный релиз.
- `development` -> интеграционная ветка.
- `feature/*` -> рабочие ветки под отдельные задачи.

Прямые коммиты в `master` запрещены.

## 1. Branch Strategy

1. Новая задача стартует от `development`.
2. Формат ветки:
- `feature/<short-name>`
- `feature/<ticket>-<short-name>`
3. Merge только через PR обратно в `development`.
4. В `master` попадает только релизный PR из `development`.

Примеры:
- `feature/tauri-bootstrap`
- `feature/queue-table-v2`
- `feature/update-flow`

## 2. Pull Request Rules

- PR для фич: `feature/*` -> `development`.
- PR для релиза: `development` -> `master`.
- В PR обязательно:
- что сделано,
- как проверено (тесты/сборка),
- риски/ограничения.
- Изменения требований фиксируются в `PRD.md`.
- Пользовательские изменения фиксируются в `CHANGELOG.md`.

## 3. Beta Build Policy

- После merge в `development` должна запускаться beta-сборка.
- Бета-теги/релизы:
- `vX.Y.Z-beta.N`
- В `master` релиз идёт только после:
- зеленых тестов,
- успешной beta-сборки,
- smoke-проверки ключевого функционала.

## 4. Commit Message Format

Conventional Commits:

`<type>(<scope>): <short summary>`

Типы:
- `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`, `revert`

Примеры:
- `feat(tauri): add app shell and command bridge`
- `fix(queue): stabilize reorder persistence`
- `ci(beta): publish beta artifact from development`

## 5. Scope for Current Cycle

Текущий цикл — миграция на `Tauri v2` в папке `VoodooLoader.Tauri/`.
Legacy-код сохранён архивом в `.archive/` и не используется как активная кодовая база.
