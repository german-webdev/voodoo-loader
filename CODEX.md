# CODEX.md

## Project context

We are building a Windows desktop application called **Voodoo Loader**.

The product is a GUI wrapper around `aria2c` for downloading large files, especially AI assets such as:
- Hugging Face model files
- GGUF files
- checkpoints
- LoRAs
- VAEs
- large binary assets from direct URLs

The app should feel like a lightweight, modern download manager specifically optimized for AI model downloading workflows.

Read `PRD.md` first. Treat it as the product source of truth.

## Product goals
The application must:
- make large file downloading easy without terminal usage
- support resumable downloads via `aria2c`
- support sequential queue processing
- support Hugging Face private downloads via bearer token
- provide a clear progress UI with size, downloaded amount, remaining amount, speed, and ETA
- support folder history and easy folder reuse
- support Russian and English UI
- stay responsive while downloads are running

## Technical direction

### Preferred stack
Use:
- Python 3.11+
- PySide6
- modular architecture, not a monolithic single file
- background worker or `QProcess`-based execution for download subprocess handling
- JSON-based settings for non-sensitive preferences

Do **not** build this as one giant script unless explicitly asked for a disposable prototype.

### Architecture preference
Use a clean project structure similar to:

```text
hf_aria2_downloader/
  src/
    hf_aria2_downloader/
      app.py
      main.py
      main_window.py
      models/
      services/
      parsers/
      widgets/
      resources/
  tests/
  PRD.md
  CODEX.md
  README.md
  pyproject.toml
```

Suggested service split:
- `services/aria2_service.py` — subprocess management, queue execution
- `services/settings_service.py` — local settings persistence
- `services/localization_service.py` — RU/EN strings
- `parsers/aria2_output_parser.py` — parse stdout lines into structured progress state

Suggested data models:
- `QueueItem`
- `TransferState`
- `AppSettings`

## UX principles

### Primary flow
The obvious user path should be:
1. Paste URL
2. Add to queue
3. Select destination folder
4. Click Download

### Progress UX
The progress bar must be honest:
- idle state must show 0% and not imply progress
- use indeterminate mode only when actual progress is unknown
- switch to determinate as soon as real progress becomes available
- surface status, size, speed, downloaded amount, remaining amount, and ETA in the interface, not only in logs

### Folder UX
The app must remember recent folders and expose them in a dropdown / combobox so the user can reuse old destinations without browsing again.

### Clipboard UX
Do not rely on fragile paste behavior in custom multiline widgets.
Prefer:
- a standard single-line URL field
- explicit Paste button
- Add to queue button

## Security principles

### HF token handling
The HF token is sensitive.

Requirements:
- do not log the token
- mask the token in command previews
- do not persist the token by default
- if token persistence is implemented, require explicit opt-in
- long-term preference: OS-secure storage, not plaintext settings

## Coding standards
- Use type hints.
- Keep modules focused and small.
- Prefer explicit data models over loose dictionaries where reasonable.
- Separate UI logic from process execution logic.
- Keep parsing logic isolated and testable.
- Write code that is readable by another engineer.
- Avoid hidden side effects.
- Avoid global state where possible.

## Implementation guidance for Codex
When generating code for this repository:
1. Read `PRD.md` and align implementation with it.
2. Preserve modular structure.
3. Do not collapse UI, parsing, settings, and subprocess logic into one file.
4. Prefer incremental changes over rewriting unrelated code.
5. When adding a feature, also update any impacted models/services/interfaces.
6. If progress parsing is uncertain, isolate assumptions in `aria2_output_parser.py`.
7. Keep UI strings centralized for localization.
8. Ensure the app stays responsive during downloads.
9. Make Windows behavior a first-class target.
10. Keep command execution safe and token-masked in UI output.

## Expected first implementation scope

### Phase 1
- project bootstrap
- app entry point
- main window shell
- settings service
- localization service
- queue UI
- folder history UI
- aria2 detection
- start/stop download integration
- log panel

### Phase 2
- structured progress parsing
- progress metadata UI
- presets + manual mode
- token support
- command preview

### Phase 3
- packaging readiness
- improved retry/error UX
- queue persistence
- optional secure token storage

## Suggested PySide6 UI sections
1. URL entry row
2. Queue section
3. Destination section
4. Naming section
5. Authentication section
6. Parameters section
7. Progress section
8. Log section

## Testing expectations
At minimum, add tests for:
- aria2 output parsing
- token masking
- settings persistence
- queue add/remove logic
- folder history behavior

## Things to avoid
- Do not hardcode Russian-only UI.
- Do not save secrets carelessly.
- Do not freeze the UI thread with blocking subprocess reads.
- Do not make the progress bar misleading.
- Do not hide important transfer metadata only inside logs.
- Do not depend on multiline text box paste as the main queue input mechanism.
- Do not put the full app into a single huge file.

## Final note for Codex
Optimize for maintainability and correctness first, then convenience.  
This project may start small, but it should be structured like a real desktop product rather than a throwaway script.
