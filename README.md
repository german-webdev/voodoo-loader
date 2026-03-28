# Voodoo Loader

Репозиторий переведен в режим **replatform на Tauri v2**.

## Текущее состояние

- Legacy-реализация (Python/PySide6) архивирована в:
  - `.archive/voodoo-loader-legacy-20260328-202314.zip`
- Рабочая кодовая база для миграции:
  - `VoodooLoader.Tauri/`
- Контекст/требования сохранены в markdown-документах (`PRD.md`, `SESSION_CONTEXT.md`, и т.д.).

## Что читать в первую очередь

- `docs/TAURI_V2_MIGRATION_PLAN_RU.md` — целевая архитектура и этапы миграции.
- `PRD.md` — продуктовые требования.
- `CONTRIBUTING.md` — git-процесс и правила PR.

## Веточная стратегия

- `master` — только стабильные релизы.
- `development` — интеграционная ветка.
- `feature/*` — рабочие фича-ветки от `development`.

Детали: см. `CONTRIBUTING.md`.
