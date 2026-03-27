# Voodoo Loader - Session Context

Updated: 2026-03-28
Project root: `F:\AI\p-m\hf_aria2_downloader_gui`

## 1) Что это за проект

`Voodoo Loader` — Windows desktop GUI downloader поверх `aria2c`.
Цель: быстрые, возобновляемые, очередные загрузки по **любым прямым ссылкам** (не только Hugging Face) с удобным UX, локализацией RU/EN и безопасной обработкой секретов.

Главный источник требований: `PRD.md`.

## 2) Что считать source of truth

1. `PRD.md` — продуктовые требования и приоритеты.
2. `CODEX.md` — инженерные принципы и ограничения.
3. `CODEX_IMPLEMENTATION_GUIDE.md` — пайплайн разработки (модули, тесты, этапность).
4. Этот файл (`SESSION_CONTEXT.md`) — оперативный контекст для продолжения сессий.

## 3) Важные договорённости

- Рабочее название зафиксировано: **Voodoo Loader**.
- Legacy MVP файлы в корне (например, старый `voodoo_loader_app.py`) **не являются архитектурной базой**.
- Параллелизм очереди: `max_concurrent_downloads = 0` означает **без ограничений**.
- Секреты по умолчанию **не сохраняются**, только явный opt-in через чекбоксы.

## 4) Текущее состояние реализации (факт)

## 4.1 Архитектура

Актуальная modular-структура (рабочая):

- `src/voodoo_loader/main.py`, `app.py`, `main_window.py`
- `models/` (`AppSettings`, `QueueItem`, `DownloadOptions`, ...)
- `services/` (`aria2_service`, `aria2_provisioning_service`, `settings_service`, `localization_service`)
- `parsers/aria2_output_parser.py`
- `widgets/settings_dialog.py`
- `tests/` (40 тестов)

## 4.2 Функционально уже сделано

- Универсальная очередь ссылок (добавление во время активной загрузки).
- Batch import `.txt`.
- Приоритеты очереди: move up/down/top/bottom.
- Retry selected / retry all failed-canceled.
- Remove selected / remove failed-canceled.
- Контекстное меню + горячие клавиши для queue-операций.
- Настройка concurrency в Settings (`0 = unlimited`).
- Прогресс + метаданные: current item, downloaded/total, remaining, speed, ETA.
- Улучшенные error hints (401/403, 404, DNS, timeout, 429, 503, disk, perms, TLS и т.д.).
- Сохранение состояния окна и ширин колонок queue.
- Восстановление незавершённой очереди между запусками.
- `aria2c` detection + auto-bootstrap (если отсутствует бинарь).
- Командный preview с маскировкой секретов.
- RU/EN локализация с переключением в приложении.

## 4.3 Authentication UX (последние итерации)

Сделано полноценно:

- Collapsible auth section (по умолчанию свернута).
- Режимы авторизации:
  - `No auth`
  - `Token + headers`
  - `Login/password`
- Динамический показ нужных полей по режиму.
- Подсказки (help text) по выбранному auth mode.
- `Show token` и `Show password`.
- Валидация перед Start/Preview:
  - token-mode: нужен token или хотя бы один header
  - basic-mode: нужны username + password
- Opt-in сохранение секрета:
  - `Remember token`
  - `Remember username`
- Сохранение `auth_mode` в settings + обратная совместимость со старыми settings.

## 4.4 Security состояние

- В логах и preview токен маскируется.
- Секреты не персистятся без opt-in.
- В portable-режиме settings хранятся в plaintext JSON рядом с exe (это явно задокументировано).

## 5) Качество/проверки

Последний стабильный прогон:

- `ruff` — passed
- `mypy` — passed
- `pytest` — **43 passed**

## 6) Portable build (уже готов)

Сделана и проверена сборка portable через PyInstaller.

Build-файлы:

- `packaging/voodoo_loader.spec`
- `scripts/build_portable.ps1`
- `scripts/build_portable.bat`

Артефакты сборки:

- `dist/portable/VoodooLoader/VoodooLoader.exe`
- `dist/portable/VoodooLoader-portable.zip`

## 7) Как быстро продолжить работу в следующей сессии

## 7.1 Минимальный стартовый чек-лист

1. Открыть и прочитать:
   - `PRD.md`
   - `SESSION_CONTEXT.md`
2. Запустить quality checks:
   - `ruff`
   - `mypy`
   - `pytest`
3. Только затем брать следующий пункт из backlog.

## 7.2 Команды

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m ruff check src tests
.\.venv312\Scripts\python.exe -m mypy src/voodoo_loader
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
.\.venv312\Scripts\python.exe -m pytest tests -q -p no:cacheprovider -p no:tmpdir
```

Запуск приложения:

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m voodoo_loader.main
```

Сборка portable:

```powershell
scripts\build_portable.ps1
```

## 8) Приоритетный backlog (следующие шаги)

1. Manual QA portable-артефакта на «чистой» машине/профиле:
   - first run
   - aria2 bootstrap
   - queue lifecycle
   - exit behavior
2. (Опционально) RPC mode поверх aria2 daemon.
3. (Важно для security roadmap) Перенос хранения секретов из plaintext в OS secure store.
4. (Опционально) Installer-версия как secondary distribution.
5. UX-полиш/локализационный pass по оставшимся статическим англоязычным строкам в UI.

## 9) Что НЕ делать

- Не возвращаться к legacy MVP как к основной базе.
- Не ломать модульную структуру в сторону монолитного скрипта.
- Не сохранять секреты без явного opt-in.
- Не использовать destructive git-операции.

## 10) Короткое резюме этапа

Проект на стадии: **feature-complete для MVP+ по PRD (core + auth UX + portable build)**.
Текущий фокус: стабилизация portable релиза, QA и security-hardening (secure credential storage).

## 11) Decision Log

- 2026-03-26: Product name fixed as `Voodoo Loader`.
- 2026-03-26: Legacy MVP files in repo root are excluded from architecture baseline; active codebase is `src/voodoo_loader`.
- 2026-03-26: Queue model fixed as dynamic queue (add links while active) plus batch import from `.txt`.
- 2026-03-26: Queue concurrency controlled by `max_concurrent_downloads`; value `0` means unlimited.
- 2026-03-26: Product scope fixed as universal downloader (not Hugging Face-only).
- 2026-03-26: Auth UX standardized via `Auth mode`: `No auth` / `Token + headers` / `Login/password`.
- 2026-03-26: Secrets are non-persistent by default; persistence only through explicit opt-in (`Remember token`, `Remember username`).
- 2026-03-26: Secret masking is mandatory in command preview and logs.
- 2026-03-26: Progress UX fixed: `downloaded/total`, `remaining`, `speed`, `ETA` are shown in UI (not logs-only).
- 2026-03-26: `aria2c` binary provisioning is mandatory; RPC is optional and does not replace local binary dependency.
- 2026-03-26: Distribution priority fixed as portable build (`VoodooLoader.exe`) over installer.
- 2026-03-26: Reproducible packaging pipeline fixed via PyInstaller (`packaging/voodoo_loader.spec`, `scripts/build_portable.ps1`).
- 2026-03-26: Portable artifacts successfully built: `dist/portable/VoodooLoader/VoodooLoader.exe` and `dist/portable/VoodooLoader-portable.zip`.
- 2026-03-26: Security trade-off documented: in portable mode, opt-in credentials are stored in plaintext JSON near exe; secure-store migration is in roadmap.

## 12) Reliability Incident Log (Skill Pipeline)

Этот раздел обязателен к пополнению при каждом багфиксе/регрессе/проблеме сборки.

### 2026-03-26 - Portable startup import crash
- Symptom: запуск `dist/portable/VoodooLoader.exe` падал с `ImportError: attempted relative import with no known parent package`.
- Root cause: entry-point `src/voodoo_loader/main.py` использовал relative imports (`from .app ...`), что ломается в packaged runtime-контексте PyInstaller.
- Fix: переведены импорты в `main.py` на absolute (`from voodoo_loader.app ...`, `from voodoo_loader.main_window ...`).
- Regression checks: `ruff`, `mypy`, `pytest`, пересборка portable, smoke launch `VoodooLoader.exe`.
- Prevention rule: entry-point файлы для packaged build должны использовать только absolute imports.

### 2026-03-26 - Portable build file lock (WinError 5)
- Symptom: PyInstaller build падал на этапе `EXE` с `PermissionError: [WinError 5]` при записи `dist/portable/VoodooLoader.exe`.
- Root cause: в момент сборки были запущены активные процессы `VoodooLoader.exe`, блокировавшие exe-файл.
- Fix: остановлены процессы `VoodooLoader`, затем выполнена повторная сборка.
- Regression checks: проверка процесса перед сборкой, успешная полная сборка portable и проверка артефактов.
- Prevention rule: перед любой portable-сборкой обязательно завершать все процессы `VoodooLoader.exe`.



### 2026-03-26 - Queue downloads received hash-like filenames from redirected sources
- Symptom: при multi-queue загрузке (например, Hugging Face `?download=true`) файлы сохранялись как длинные hash-строки вместо ожидаемых имён `.safetensors`.
- Root cause: `-o` задавался только при ручном `filename_override`; при пакетной очереди override игнорировался, и aria2 брал имя из redirect URL (hash key).
- Fix: в `Aria2Service.build_command_args` добавлен авто-вывод имени из исходного URL path для каждого item (если имя доступно), с приоритетом ручного override.
- Regression checks: `ruff`, `mypy`, `pytest`, rebuild portable, smoke launch exe.
- Prevention rule: для URL с явным basename в path всегда передавать `-o <basename>` в aria2, чтобы redirect-URL не переименовывал файлы в hash.

### 2026-03-27 - UI/UX upgrade batch implemented (menus/queue/settings)
- Scope: queue column redesign, checkbox selection, drag-and-drop reorder, priority menu, status colors, File/Downloads/View/Settings menu layout, Import action move, open file/folder actions, logs visibility toggle and sort actions.
- Settings migration: aria2 tuning and auth controls moved to Settings dialog; inline queue-management buttons removed from primary control row and moved to context/menu actions.
- Verification: `ruff`, `mypy`, `pytest` passed (`45 passed`).
- Audio: integrated status-based playback for start/success/failure using provided assets.
- Smoke run: application start verified after sound integration.
- 2026-03-27: Fixed top-menu overlap caused by visible service controls and added Progress accordion (Less/More).

### 2026-03-27 - Queue rows unreadable on dark theme
- Symptom: в блоке очереди строки выглядели «белыми», содержимое было плохо читаемо (низкий контраст текста/фона).
- Root cause: в `_append_or_update_row` для статуса `Queued` принудительно задавался фон `#ffffff`, а цвет текста не фиксировался; в dark theme текст оставался светлым.
- Fix: дефолтный фон переведён на theme-aware `palette.base()`, добавлен авто-подбор `foreground` по контрасту и явная установка `cell.setForeground(...)`.
- Regression checks: визуальная проверка очереди в dark theme, `ruff`, `mypy`, `pytest`.
- Prevention rule: для таблиц Qt использовать palette-aware default colors; при кастомном фоне строки всегда задавать контрастный foreground.

### 2026-03-27 - No sound playback in portable runtime
- Symptom: в собранной portable-версии звуки start/success/failure не воспроизводились.
- Root cause: `SoundService` зависел от одного `QMediaPlayer` и узкого пути ресурсов; в packaged runtime это приводило к silent-failure (особенно при быстрых событиях/вариантах расположения ресурсов).
- Fix: реализован resilient sound pipeline: расширенный поиск ресурсов (`_MEIPASS`, `_internal`, `sys.executable`), отдельный player/audio-output на событие, обработка media errors с логированием.
- Regression checks: `ruff`, `mypy`, `pytest` (включая обновлённые тесты `test_sound_service.py` для `_MEIPASS` и `_internal` fallback), пересборка portable.
- Prevention rule: multimedia в packaged build должно иметь runtime-fallback пути и error logging; playback не должен зависеть от одного shared player.

### 2026-03-27 - Portable audio silent despite packaged sound assets
- Symptom: в очереди/завершении загрузки не слышны start/success/failure звуки, хотя mp3 присутствуют в `dist`.
- Root cause: зависимость от Qt Multimedia backend без platform fallback приводила к silent-runtime кейсам на части Windows окружений.
- Fix: `SoundService` дополнен Windows MCI fallback (mp3), runtime audio diagnostics `[AUDIO] ...`, усилен Qt playback setup (unmuted + volume 1.0) и сохранён multi-path resource resolve.
- Regression checks: `ruff`, `mypy`, `pytest` (`46 passed`), portable rebuild.
- Prevention rule: для мультимедиа в desktop portable обязательно иметь backend fallback и явные runtime diagnostics в UI logs.

### 2026-03-27 - Sound triggers skipped due shared queue-item mutation
- Symptom: в Logs отсутствовали строки `[AUDIO]`, звуки старта/успеха/ошибки не воспроизводились.
- Root cause: `Aria2Service` и UI разделяли один и тот же экземпляр `QueueItem`; статус мутировал в сервисе до обработки сигнала в UI, поэтому `previous_status` == `new_status` и sound-trigger блок не срабатывал.
- Fix: в `Aria2Service.enqueue_items` введено копирование `QueueItem` (`dataclasses.replace`) для изоляции service-state от UI-state; в UI добавлены явные лог-записи `[AUDIO] Trigger ...`.
- Regression checks: `ruff`, `mypy`, `pytest` (`47 passed`), portable rebuild.
- Prevention rule: состояние доменной модели между worker/service и UI должно быть изолировано; shared mutable objects для статусных событий запрещены.


### 2026-03-28 - Queue drag-and-drop corrupted rows/selection (row loss, naming mismatch)
- Symptom: ??? drag'n'drop ? Download queue ???????? select, ???????? ?????? (????????, ???? 3 ??????, ??????????? 2), ??????? naming.
- Root cause: reliance ?? `QTableWidget` internal move (`rowsMoved`) ???????? ? ???????????? ???????????? item-level ?????; ?????? ? `queue_order` ???????????.
- Fix: ??????? controlled DnD pipeline: `QueueTableWidget` ? `rows_dropped` ???????? + deterministic reorder ????? `MainWindow._reorder_ids_by_drag_drop(...)` + ???????????? rebuild ??????? ????? reorder.
- Regression checks: `PYTHONPATH=src pytest -q` -> `49 passed`.
- Prevention rule: ??? queue reorder ???????????? domain-order (`queue_order`) ??? single source of truth; UI-table ????? dnd ?????? ???????? ?????? ????? rebuild.

### 2026-03-28 - Source recovery incident (`main_window.py` truncation)
- Symptom: `src/voodoo_loader/main_window.py` ???????? ??????????? ?????? (3 ?????) ????? ????????? ??????? ??????.
- Root cause: failed edit flow + unreliable patch path ? sandbox ? `apply_patch` setup refresh errors.
- Fix: ???? ????????? ???????????? ?? runtime artifacts (`.pyc` + ?????????????? ???????), ??????????? ?????? ??????? ?????????? ?? ??????? ??????, ????????? ???????? ????????.
- Regression checks: ?????? ????????????? (`py_compile`), import ???????, `49 passed`.
- Prevention rule: ????? ????????? ???????? ?????? pre-edit backup ?????????; ??? sandbox patch-failure ?????????? ?? scripted non-destructive edits ? ??????????????? compile checks.


### 2026-03-28 - Queue drag-and-drop rows disappearing (Qt move-action side effect)
- Symptom: ??? drag'n'drop ?????? ??????? ????????/??????????? ?????????? ????????? ? UI.
- Root cause: `QTableWidget` DnD ??????? ? `MoveAction`, ????? ????? ????????? ??????? ??????? ??/?? ????? ????????????????? reorder.
- Fix: `QueueTableWidget` ????????? ?? ?????????? DnD pipeline (`startDrag` + `dropEvent`) ? `CopyAction` ? ?????? reorder ????? `queue_order` ??? source-of-truth.
- Regression checks: targeted queue tests + full `pytest` pass.
- Prevention rule: ??? reorder ? ??????? ?? ???????????? model-mutating move-action, ???? ??????? ??????????? ???????? ???????.

