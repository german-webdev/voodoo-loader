# CODEX_IMPLEMENTATION_GUIDE.md

## Purpose of this guide

This guide explains how to build **Voodoo Loader** in an IDE with Codex or another coding agent, using `PRD.md` and `CODEX.md` as the main context files.

The goal is to help you create the application in a controlled, modular, production-friendly way instead of generating one oversized script.

## 1. Recommended development approach
Use this workflow:
1. Put `PRD.md`, `CODEX.md`, and this file in the repository root.
2. Open the repository in your IDE.
3. Ask Codex to read `PRD.md` and `CODEX.md` before writing code.
4. Build the app incrementally in milestones.
5. Review each milestone before moving to the next one.

Do not ask Codex to generate the entire finished application in a single prompt.

## 2. Recommended stack
Use:
- Python 3.11+
- PySide6
- `pyproject.toml`
- modular `src/` layout
- `pytest` for tests
- `ruff` and optionally `black`

Recommended packaging later:
- PyInstaller

## 3. Recommended repository structure

```text
hf_aria2_downloader/
  src/
    hf_aria2_downloader/
      __init__.py
      main.py
      app.py
      main_window.py
      models/
        __init__.py
        queue_item.py
        transfer_state.py
        app_settings.py
      services/
        __init__.py
        aria2_service.py
        settings_service.py
        localization_service.py
      parsers/
        __init__.py
        aria2_output_parser.py
      widgets/
        __init__.py
      resources/
        __init__.py
  tests/
    test_aria2_output_parser.py
    test_settings_service.py
    test_token_masking.py
    test_folder_history.py
  PRD.md
  CODEX.md
  CODEX_IMPLEMENTATION_GUIDE.md
  README.md
  pyproject.toml
```

## 4. Build plan by milestones

### Milestone 1 вЂ” bootstrap
Goal:
- initialize project structure
- create `pyproject.toml`
- create app entry point
- create minimal PySide6 window
- add README scaffold

Prompt example:

```text
Read PRD.md and CODEX.md. Bootstrap the project as a Python 3.11 + PySide6 desktop app using a src layout. Create pyproject.toml, a runnable main entry point, a minimal main window, and a README scaffold. Keep the architecture modular.
```

### Milestone 2 вЂ” settings and localization
Goal:
- create settings service
- create RU/EN localization structure
- persist language and non-sensitive preferences
- implement initial language switching

Prompt example:

```text
Read PRD.md and CODEX.md. Implement a settings service and a localization service. Support RU and EN UI strings. Persist language, folder history, continue-download preference, and selected aria2 preset in a JSON settings file. Do not persist HF token by default.
```

### Milestone 3 вЂ” queue and destination UX
Goal:
- implement URL entry row
- add queue list/table
- add queue controls
- add folder combobox with history
- add browse button

Prompt example:

```text
Read PRD.md and CODEX.md. Implement the main queue workflow in the PySide6 UI: URL input, Paste button, Add to queue button, queue list, remove selected, clear queue, import URLs from txt, destination folder combobox with history, and browse button.
```

### Milestone 4 вЂ” aria2 integration
Goal:
- detect `aria2c`
- create subprocess execution service
- start/stop queue processing
- capture logs without freezing UI

Prompt example:

```text
Read PRD.md and CODEX.md. Implement an aria2 service for Windows that can detect aria2c, run it as a subprocess in the background, process a queue sequentially, stop the current download, and stream stdout/stderr back to the UI without blocking the UI thread.
```

### Milestone 5 вЂ” progress parsing
Goal:
- parse aria2 output into structured transfer state
- drive progress UI from parsed state
- expose size, downloaded, remaining, speed, ETA

Prompt example:

```text
Read PRD.md and CODEX.md. Implement aria2 output parsing in a dedicated parser module. Convert stdout lines into structured progress state including percent, total size, downloaded amount, remaining amount, speed, and ETA when available. Update the UI progress section from this structured state.
```

### Milestone 6 вЂ” parameters, naming, token
Goal:
- preset selector
- manual mode
- single-download custom filename
- token input and masking
- command preview

Prompt example:

```text
Read PRD.md and CODEX.md. Implement aria2 presets with Manual mode, optional single-download custom filename, HF token support via Authorization header, token masking in command preview/log-related UI, and command preview for the first queued item.
```

### Milestone 7 вЂ” tests and polish
Goal:
- add tests
- fix edge cases
- improve user-facing errors
- prepare for packaging

Prompt example:

```text
Read PRD.md and CODEX.md. Add tests for aria2 output parsing, token masking, settings persistence, and folder history behavior. Then clean up UX edge cases and ensure the app is packaging-ready for Windows.
```

## 5. Recommended вЂњskillsвЂќ to emulate during development
These are development roles / prompt modes you can use with Codex in IDE.

### Skill 1 вЂ” Product engineer
Use when:
- turning requirements into implementation plans
- deciding scope
- shaping user flows

Prompt style:
```text
Act as a product-minded desktop engineer. Read PRD.md and propose the smallest high-quality implementation slice for the next milestone.
```

### Skill 2 вЂ” Desktop architect
Use when:
- planning module structure
- deciding signal/slot boundaries
- separating UI and services

Prompt style:
```text
Act as a senior desktop architect. Read PRD.md and CODEX.md and propose a maintainable PySide6 architecture for this app with services, models, and parser separation.
```

### Skill 3 вЂ” UI/UX implementer
Use when:
- refining layouts
- improving progress section
- reducing confusion in the UI

Prompt style:
```text
Act as a desktop UI/UX engineer. Improve the main window layout for clarity and efficiency while keeping the flow: paste URL, add to queue, choose folder, download.
```

### Skill 4 вЂ” Parser engineer
Use when:
- working specifically on aria2 output parsing
- making progress calculations more robust

Prompt style:
```text
Act as a parsing and observability engineer. Build a robust parser for aria2 stdout lines and convert them into a structured TransferState model.
```

### Skill 5 вЂ” Security reviewer
Use when:
- token handling is being implemented
- settings persistence touches secrets

Prompt style:
```text
Act as a security-minded reviewer. Inspect the implementation for HF token leakage risks in logs, settings, subprocess invocation, and UI previews.
```

### Skill 6 вЂ” Refactoring engineer
Use when:
- generated code became too large
- files are mixed-responsibility
- architecture needs cleanup

Prompt style:
```text
Act as a refactoring engineer. Split this implementation into smaller modules without changing behavior. Keep PySide6 logic clean and maintainable.
```

### Skill 7 вЂ” Test engineer
Use when:
- building parser tests
- validating folder history and settings behavior

Prompt style:
```text
Act as a Python test engineer. Add focused pytest coverage for parser behavior, token masking, folder history persistence, and settings load/save edge cases.
```

## 6. Good prompt patterns for Codex

### 6.1 Strong prompts
Good prompts:
- say which files to read
- define the milestone
- constrain scope
- request modularity
- ask for minimal but complete slices

Example:
```text
Read PRD.md and CODEX.md. Implement only the settings service and folder history persistence. Do not modify unrelated download logic. Keep the code modular and typed.
```

### 6.2 Weak prompts
Avoid vague prompts like:
- вЂњbuild the whole appвЂќ
- вЂњmake it betterвЂќ
- вЂњadd everythingвЂќ
- вЂњrewrite all filesвЂќ

## 7. Functional checklist for final app

### Queue
- [ ] User can paste URL into a standard input field
- [ ] User can add URL to queue
- [ ] User can import URLs from txt
- [ ] User can remove selected queue items
- [ ] User can clear queue

### Destination
- [ ] User can browse for folder
- [ ] User can type folder manually
- [ ] Recent folders are remembered
- [ ] Recent folders appear in a dropdown

### Download execution
- [ ] aria2 presence is checked
- [ ] Queue downloads sequentially
- [ ] Current download can be stopped
- [ ] Resume mode works

### Progress UX
- [ ] Idle progress is visually empty
- [ ] Unknown progress uses indeterminate mode
- [ ] Known progress uses determinate mode
- [ ] Size / downloaded / remaining / speed / ETA are visible in UI

### Security
- [ ] Token is masked in previews/logs
- [ ] Token is not persisted by default

### Localization
- [ ] RU works
- [ ] EN works
- [ ] Language is remembered

### Quality
- [ ] UI stays responsive
- [ ] Parser is isolated
- [ ] Settings service is isolated
- [ ] No giant single-file architecture

## 8. Suggested first prompt to start coding

```text
Read PRD.md, CODEX.md, and CODEX_IMPLEMENTATION_GUIDE.md. Bootstrap this project as a Python 3.11 + PySide6 Windows desktop app with a src layout. Create pyproject.toml, app entry point, main window skeleton, settings service, localization service, and README. Keep the architecture modular and do not implement everything in one file.
```

## 9. Suggested follow-up prompt for the first real feature slice

```text
Read PRD.md and CODEX.md. Implement the queue-building workflow only: single URL input, Paste button, Add to queue button, queue list, remove selected, clear queue, import from txt, destination folder combobox with recent history, and settings persistence for recent folders.
```

## 10. Final recommendation
Treat this app like a real desktop product, not a quick script.

That means:
- small modules
- explicit models
- safe token handling
- clear progress UX
- responsive UI
- incremental delivery
- tests for parsing and settings behavior

If Codex starts producing bloated files, stop and redirect it with a refactoring prompt before continuing.

## 11. Reliability skill pipeline (mandatory)

Use this pipeline after every bugfix, packaging issue, or production defect.

### 11.1 Incident capture format
For each issue, capture:
- Date
- Symptom
- Root cause
- Fix
- Regression checks
- Prevention rule

Store incidents in `SESSION_CONTEXT.md` under a dedicated incident log section.

### 11.2 Mandatory release gates
Before declaring a fix complete:
- run `ruff`, `mypy`, and `pytest`
- rebuild portable artifact
- run a smoke launch of portable `VoodooLoader.exe`
- document the incident and prevention rule in `SESSION_CONTEXT.md`

### 11.3 Known high-risk rules for this project
- Entry-point modules used by PyInstaller must use absolute imports, not relative imports.
- Before PyInstaller build, ensure no running `VoodooLoader.exe` process exists (to avoid `WinError 5` file lock failures).
- Any packaging/runtime defect must result in at least one new prevention rule in the incident log.
- Queue row coloring must be palette-aware: never hardcode white default row backgrounds; always set readable foreground when status backgrounds are applied.
- Sound playback in packaged runtime must resolve resources via multiple frozen-layout candidates and must log media backend errors.

## 12. UI overhaul skill gate (2026-03-27)

For the current upgrade cycle, implementation must follow `UPGRADE_LIST.md` and PRD section `14. UI/UX Upgrade Program`.

Mandatory rule:
- when changing queue/menu/settings UX, update both PRD and `UPGRADE_LIST.md` status in the same task.

Verification gate for each completed upgrade item:
- matching UI behavior implemented
- localization keys added for RU/EN labels
- queue/context actions available in both context menu and `Downloads` menu (where required)
- tests updated or added for changed behavior


