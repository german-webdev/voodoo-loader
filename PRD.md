# PRD - Voodoo Loader

## 1. Product overview

**Product name:** Voodoo Loader

**Type:** Desktop application for Windows

**Primary goal:**  
Provide a fast, reliable, user-friendly GUI for downloading large files from direct URLs with `aria2c`, without requiring terminal usage.

**Core user problem:**  
Users downloading large files often need:
- resumable downloads
- multi-connection speedups
- queueing multiple URLs
- clear and trustworthy progress
- optional authentication (token and/or login/password) for protected sources
- easy folder reuse

The CLI workflow is powerful but inconvenient for many users.

## 2. Goals

### 2.1 Primary goals
- Let users paste one or more URLs and download files with minimal friction.
- Use `aria2c` for speed, retry support, and resume support.
- Support protected sources with optional auth fields:
  - Bearer token / custom headers
  - login/password for HTTP/FTP auth when needed
- Provide a clear and trustworthy progress experience.
- Remember previously used folders and expose them as a selectable history.
- Support both Russian and English UI.
- Ensure app works out-of-the-box even when `aria2c` is not preinstalled.

### 2.2 Secondary goals
- Make the application feel like a modern download manager.
- Minimize confusion around advanced `aria2c` parameters using presets.
- Keep implementation modular so the app can evolve later.

### 2.3 Non-goals
- Not a torrent-first power client with full swarm analytics.
- Not a browser extension.
- Not an OAuth browser automation tool.
- Not a website account manager.
- Not a cloud sync client.

## 3. Target users

### 3.1 Primary users
- Users who download large files repeatedly and want a GUI instead of terminal commands.
- Users downloading assets from mixed sources (model hubs, file hosting, internal URLs, static links).
- Windows users with mixed technical skill levels.

### 3.2 Secondary users
- Technical users who want quick access to `aria2c` without manual command construction.
- Users working with protected URLs that require headers and/or credentials.

## 4. User stories

### 4.1 Core stories
- As a user, I want to paste a URL and start a download quickly.
- As a user, I want to add multiple URLs into a queue and process them sequentially.
- As a user, I want to choose a destination folder and reuse recent folders.
- As a user, I want to resume interrupted downloads.
- As a user, I want to see size, speed, downloaded amount, remaining amount, ETA, and current status in the UI.
- As a user, I want optional auth fields for protected sources:
  - token / custom Authorization header
  - login/password
- As a user, I want to choose between Russian and English.
- As a user, I want the app to install/provision `aria2c` automatically if missing.

### 4.2 Power-user stories
- As a user, I want sensible presets for `aria2c` performance tuning.
- As a user, I want manual mode for advanced `aria2c` values.
- As a user, I want command preview before launch.
- As a user, I want logs for troubleshooting.
- As a user, I want optional RPC mode for richer status polling.

## 5. Functional requirements

### 5.1 URL input and queue
The application must:
- provide a single URL input field
- provide a "Paste" action
- provide an "Add to queue" action
- show queued URLs in a visible queue list
- allow removing selected queue items
- allow clearing the queue
- allow importing URLs from a `.txt` file (one URL per line)
- prevent duplicate URLs in queue when practical

### 5.2 Download folder selection
The application must:
- allow selecting a folder via the OS file picker
- allow manually editing the folder path
- keep a folder history list
- expose folder history via a dropdown / combo box
- remember recent folders between sessions

Folder history requirements:
- keep at least 10-15 most recent unique paths
- move a reused path to the top
- persist locally in settings

### 5.3 File naming
The application must:
- support automatic file name detection from URL
- support custom file naming for single-download mode
- ignore custom file name for multi-item queues, with clear UX behavior

### 5.4 Authentication support (optional)
The application must:
- allow running without any auth fields for public URLs
- allow entering a bearer token (or generic token string)
- allow adding at least one custom header line
- allow entering login and password for sources that require basic credentials
- provide show/hide controls for sensitive inputs
- pass auth data to `aria2c` via supported flags/headers

Security requirements:
- secrets must not be logged in plaintext
- secrets must be masked in command previews and UI logs
- secrets must not be persisted by default
- if secret persistence is added, it must be explicit opt-in
- if persistence is implemented, document whether storage is plaintext or secure-store

### 5.5 aria2 parameter handling
The application must:
- support presets for typical usage
- support manual override mode

Required presets:
- Safe
- Balanced (recommended)
- Fast
- Aggressive
- Very large files
- Manual

Recommended defaults:
- Safe: `-x 4 -s 4 -k 1M`
- Balanced: `-x 16 -s 16 -k 1M`
- Fast: `-x 24 -s 24 -k 1M`
- Aggressive: `-x 32 -s 32 -k 1M`
- Very large files: `-x 16 -s 16 -k 4M`
- Manual: editable fields

### 5.6 Download execution
The application must:
- invoke `aria2c` on Windows
- support queue processing (at least sequential mode)
- support stopping current download
- support stopping queue
- support resume via `-c` where protocol supports resume
- capture stdout/stderr without blocking UI

### 5.7 Progress and status UI
The application must provide:
- current item status text
- progress bar
- total size
- downloaded amount
- remaining amount
- speed
- ETA
- detailed log panel

Behavior requirements:
- use indeterminate progress only when completion is unknown
- switch to determinate once progress is known
- when idle, show 0% (no misleading partial state)
- do not show non-zero visual progress in ready/idle state
- keep transfer metadata visible outside logs

### 5.8 Localization
The application must:
- support Russian and English
- allow switching language in-app
- persist selected language between sessions

### 5.9 Logs
The application must:
- show raw or near-raw `aria2c` output in a log panel
- allow clearing the log
- avoid exposing secrets (token/password/header secrets) in logs or previews

### 5.10 Settings persistence
The application must persist at least:
- selected language
- recent folders
- last selected preset
- continue/resume toggle
- preferred user-agent (if editable)

The application should not persist sensitive data by default.

### 5.11 aria2 provisioning and runtime mode
The product must work even when user has no preinstalled `aria2c`.

Provisioning requirements:
- on startup, detect `aria2c` in this order:
  1. bundled app binary path
  2. local app directory
  3. PATH
- if not found, offer automatic bootstrap:
  - download official `aria2` Windows release package
  - verify integrity (minimum: SHA-256; optionally signature verification)
  - unpack to app-managed directory and use that binary
- if bootstrap fails, show actionable fallback (retry, manual path selection)

Runtime modes:
- **Default mode (required):** local subprocess execution of `aria2c`
- **Optional advanced mode:** local `aria2c` daemon with `--enable-rpc` and JSON-RPC polling

Important product decision:
- RPC mode does **not** remove the need for `aria2c` binary; it only changes control/telemetry channel.
- Therefore, binary provisioning is mandatory regardless of RPC support.

### 5.12 Queue and multi-download behavior
The application must support both queue input styles:
- **Dynamic queue (primary):** user can add new links while downloads are already running.
- **Batch queue (secondary):** user can add/import a pack of links before start (`paste many`, `.txt` import).

Execution model requirements:
- Queue is a persistent ordered list.
- New items added during active downloading are appended to queue and processed automatically.
- Default execution mode: **sequential** (`1 active item`), to maximize predictability.
- Optional advanced setting: configurable concurrent items (`N > 1`) for power users.
- Queue item controls: remove pending, retry failed, move up/down priority.
- Drag-and-drop reordering must be lossless: item count, item IDs, names, and checkbox selection state must remain consistent after each reorder operation.
- Queue order is source-of-truth in domain state; UI table order must be derived from queue model after reorder.

UX requirements for queue while active:
- Adding items must not interrupt current item.
- User must always see active item + pending count + failed count.
- On stop, app should preserve unfinished queue state for next launch (if queue persistence enabled).

## 6. UX requirements

### 6.1 General UX principles
- App should be understandable without reading documentation.
- Primary flow should be obvious: paste URL -> add to queue -> choose folder -> download.
- UI should separate queue management, destination, authentication, performance options, progress/status, and logs.

### 6.2 Authentication UX
- Keep auth section collapsed by default (optional).
- Provide clear mode labels: `No auth`, `Token/Header`, `Login/Password`.
- Explain that auth is needed only for protected sources.
- Never echo plaintext secrets in status text or logs.

### 6.3 Progress UX best practices
- Use indeterminate progress only when real percentage is unknown.
- Use determinate progress once completion data is available.
- Avoid fake precision.
- Show textual status near the bar.
- Show transfer metadata around/under the bar.
- Keep status messages human-readable.

### 6.4 Error UX
Errors should:
- be surfaced in UI
- include useful detail
- remain understandable to non-expert users
- include likely next action (retry, check credentials, check source URL, check disk space)

### 6.5 Clipboard UX
Preferred pattern:
- dedicated URL input field
- explicit Paste button
- standard keyboard paste support

### 6.6 Exit behavior
The application must provide:
- explicit `Exit` action/button in UI menu or toolbar
- window close (`X`) handling with the same shutdown policy as `Exit`

If downloads are active during exit:
- show confirmation dialog with clear choices:
  - `Stop downloads and exit`
  - `Cancel` (return to app)
- optional future behavior: `Minimize to tray and keep downloading`

Shutdown requirements:
- stop queue orchestration safely
- terminate/close active `aria2c` process gracefully, then force-stop on timeout
- avoid orphan background `aria2c` processes after app exit
- persist non-sensitive UI state before final close

## 7. Technical requirements

### 7.1 Platform
- Windows first
- Python 3.11+ recommended

### 7.2 UI framework
Preferred:
- PySide6 or PyQt6

Reason:
- better maintainability than Tkinter for a growing app
- better model/view components
- better long-term structure

### 7.3 Architecture
Recommended modular structure:
- `app.py` / entry point
- `main_window.py`
- `models/queue_item.py`
- `models/transfer_state.py`
- `services/aria2_service.py`
- `services/aria2_provisioning_service.py`
- `services/auth_service.py`
- `services/settings_service.py`
- `services/localization_service.py`
- `parsers/aria2_output_parser.py`
- optional `services/aria2_rpc_service.py`

### 7.4 Subprocess and threading
Use background worker or `QProcess` so UI never freezes.

Requirements:
- no blocking subprocess reads on UI thread
- thread-safe UI updates
- clean stop/cancellation behavior

### 7.5 Settings and secrets
Recommended:
- JSON config in user app data directory for non-sensitive settings
- OS credential store if secret persistence is later enabled

### 7.6 aria2 bootstrap implementation notes
Recommended:
- pin expected aria2 version in app config
- download over HTTPS from official release source
- verify hash before first execution
- keep bootstrap logs user-readable
- allow manual override path to custom `aria2c.exe`

### 7.7 Distribution format and launch model
Primary distribution target:
- **Portable build (priority):** unpack folder and run `VoodooLoader.exe`

Portable requirements:
- app can run without installer and without admin rights
- app bundles required runtime dependencies
- app supports local self-contained mode (settings near app) or user-profile mode (AppData), configurable

Secondary (optional) target:
- installer package for wider mainstream distribution (later phase)

Launch behavior:
- single executable entry point (`VoodooLoader.exe`)
- startup initializes services, checks/provisions `aria2`, restores queue/settings, then opens main window

## 8. Recommended implementation phases

### Phase 1 - Core MVP
- app shell
- queue management
- folder selection/history
- start/stop download
- subprocess integration
- logs
- basic progress parsing
- RU/EN UI
- presets
- command preview

### Phase 2 - Universal auth and provisioning
- auth section (token, header, login/password)
- secret masking hardening
- aria2 detection flow
- automatic aria2 bootstrap if missing
- improved installation/provisioning UX

### Phase 3 - UX and architecture polish
- robust progress parsing
- clearer status transitions
- queue item statuses
- queue persistence
- optional RPC mode
- packaging-ready installer

## 9. Success criteria
The product is successful if:
- non-technical users can download large files from arbitrary direct URLs without terminal usage
- users can reliably resume interrupted downloads
- users can reuse recent folders without re-browsing
- users clearly understand progress and transfer state
- protected downloads work with optional token or login/password input
- app works on a clean Windows machine without preinstalled aria2
- RU/EN localization works without broken strings

## 10. Acceptance criteria
- User can add multiple URLs into queue and download sequentially.
- User can select folder and reuse it from dropdown history.
- User can choose RU/EN and see full UI translated.
- User can download public URLs without auth fields.
- User can input token/header for protected source and download successfully.
- User can input login/password when source requires credentials.
- User can stop current download and queue.
- User can resume interrupted downloads where supported.
- Idle progress bar does not imply completion.
- Transfer metadata is visible in UI and not only in logs.
- Secrets are masked in command previews and logs.
- App remains responsive during downloads.
- If `aria2c` is missing, app can bootstrap it automatically or provide clear manual fallback.

## 11. Risks and mitigations

### Risk: fragile parsing of aria2 output
Mitigation:
- isolate parsing logic in dedicated parser module
- test against multiple sample outputs

### Risk: secret leakage in UI/log/settings
Mitigation:
- centralize masking logic
- default to non-persistence for secrets
- require explicit opt-in for secret persistence

### Risk: bootstrap/install failures for aria2
Mitigation:
- retries with clear messaging
- checksum validation with explicit error states
- manual `aria2c` path fallback

### Risk: confusing auth UX
Mitigation:
- optional collapsed auth section
- clear helper text and mode labels
- actionable auth failure messages

### Risk: confusing progress UX
Mitigation:
- strict determinate/indeterminate rules
- keep speed/ETA/size outside logs

## 12. Recommended stack
- Python 3.11+
- PySide6
- subprocess + worker thread / QProcess
- optional local JSON-RPC mode for advanced telemetry
- JSON settings storage (non-sensitive)
- PyInstaller (or equivalent) for packaging

## 13. Summary
Voodoo Loader is a Windows GUI for fast, resumable downloads from arbitrary direct URLs using `aria2c`.  
The product prioritizes trust, clarity, and out-of-box usability: optional auth for protected sources, honest progress UX, queue-driven workflow, safe secret handling, bilingual interface, and automatic `aria2` provisioning when missing.

## 14. UI/UX Upgrade Program (2026-03-27)

This program is mandatory and tracked in `UPGRADE_LIST.md`.

### 14.1 Queue and list UX
- Remove `Destination` from queue table.
- Show per-item total size in queue table.
- Add localized queue block title (`Queue downloads` / `РћС‡РµСЂРµРґСЊ Р·Р°РєР°С‡РµРє`).
- Add item checkbox selection and `Select all` control.
- Add status color coding:
  - failed = red
  - downloading = orange
  - completed = green
- Replace priority move buttons (`up/down/top/bottom`) with drag-and-drop row reordering.
- Add per-item priority (`High` / `Medium` / `Low`) via context menu.

### 14.2 Menus and actions
- Top-level menus order must be:
  - `File`
  - `Downloads`
  - `View`
  - `Settings`
- Move `Import .txt` action into `File` menu.
- Queue operations currently shown as buttons above logs must be moved into queue context menu and duplicated in `Downloads` menu.
- Add actions to open downloaded file and open containing folder.

### 14.3 Settings migration
- Move aria2 tuning options from inline panel to `Settings` dialog.
- Rename inline speed block to `Speed` / `РџСЂРµСЃРµС‚С‹ СЃРєРѕСЂРѕСЃС‚Рё`.
- Move `Continue / Resume (-c)` into `Settings` and provide an explanatory hint.
- Move authentication controls into `Settings` dialog.

### 14.4 View and layout
- Queue area height must be user-resizable.
- Logs area height must be user-resizable.
- Progress block must support accordion behavior:
  - `Less` mode shows only progress bar.
  - `More` mode shows full transfer metadata (status, counts, downloaded/total, remaining, speed, ETA).
- `View` menu must include:
  - show/hide Logs block
  - sort queue by date added
  - sort queue by extension
  - sort queue by priority

### 14.5 Audio notifications
- Start/success/failure sound cues must be supported using project-provided assets (`start.mp3`, `success.mp3`, `failure.mp3`).
- Audio playback should trigger on status transitions and fail gracefully if media backend is unavailable.

### 14.6 Delivery constraint
- Final release build must not be produced until all upgrade items are implemented and verified.

### 14.7 Mandatory regression coverage for updates
- Every feature/update that changes behavior must ship with automated tests before build.
- Critical start path (`_build_download_options`, auth resolution, `_start_queue`) requires dedicated regression tests.
- Portable build is allowed only after green full test suite.

### 14.8 Help Menu and In-App Update Flow
- Add top-level menu `Help` / `Помощь` after `Settings`.
- `Help` must include two modal actions:
  - `Check Voodoo Loader updates` / `Проверить обновление Voodoo Loader`
  - `About` / `О программе`
- Update-check modal flow:
  1. Show blocking modal state `Checking for updates...`.
  2. Query GitHub Releases API for configured repository.
  3. If no newer version exists, show modal: "You already have the latest version".
  4. If newer version exists, show current/target versions and confirmation controls (`Update`, `Cancel`).
  5. On confirm, download release asset and apply update via external updater process.

### 14.9 GitHub Releases Update Channel
- Update source: GitHub Releases.
- Expected release payload:
  - semantic version tag (e.g. `v0.1.0-alpha`)
  - portable zip asset (`*portable*.zip` preferred)
  - optional `.sha256` asset for integrity verification.
- The app must support opening release page when direct update asset is unavailable.
- Update must be blocked while active downloads are running.

## 15. Versioning and Release Notes
- Versioning standard: SemVer with optional pre-release suffixes (`-alpha`, `-beta`, etc.).
- Initial release line: `0.1.0-alpha`.
- Every release must update `CHANGELOG.md` with patch notes.
- Changelog entries must include: Added / Changed / Fixed / Known Issues.
- Git tags must match release versions (`v0.1.0-alpha`, `v0.1.1`, etc.).