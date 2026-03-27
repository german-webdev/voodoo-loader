# Incident Log

## 2026-03-28 - Update applied but app stayed on old version and did not relaunch

### Symptoms
- App detected newer release correctly, but after update flow and restart the version stayed old.
- Auto-restart after update sometimes did not happen (app closed only).
- Busy update modal rendered as blank/white in some environments.

### Root causes
1. Updater relied on direct archive extraction into install folder without handling nested top-level folders in release archives.
2. Relaunch path resolution was too strict (`$ExePath` only), so restart could fail after extraction layout changes.
3. Busy update modal had insufficient explicit styling, causing unreadable/blank appearance on some themes.

### Fixes
- Reworked updater script to:
- Added updater launch hardening:
  - explicit Windows PowerShell executable resolution (`SystemRoot` fallback to `powershell`/`pwsh`)
  - robust file replacement using `robocopy` with retries and exit-code validation
  - disabled `close_fds` for detached updater process compatibility on Windows
  - extract into temporary `unpacked` directory
  - normalize source root (flat or nested archive layout)
  - copy files into install dir explicitly
  - resolve launch path via multiple candidates
  - write failure details to `voodoo_loader_updater.log` and continue with cleanup
- Added forced parent-process stop fallback after wait timeout.
- Added hidden/no-profile PowerShell updater launch flags.
- Restored visible percent text in main progress bar and set empty-track color to `#ACAFB5`.
- Styled update busy modal explicitly for dark UI readability.

### Prevention
- Any updater logic change must include regression assertions for script generation (extract/copy/relaunch/error log paths).
- Progress-bar visual changes must be covered by style-constant tests and checked in packaged build smoke-test.

## 2026-03-28 - Auto-tag created but build/release chain did not start

### Symptoms
- `Auto Tag On Master` created/pushed a valid tag (`v*-alpha`), but `Build Portable Matrix` was skipped.
- GitHub Release was not created even though tag existed.

### Root causes
1. Tag push from workflow token did not reliably trigger downstream `push.tags` workflow chain.
2. Auto-tag workflow exited early when tag already existed on `HEAD`, without forcing build/release dispatch.
3. Triggering depended on CLI path only, which increased silent-failure risk.

### Fixes
- Added explicit `actions: write` permission to auto-tag workflow.
- Added workflow-dispatch trigger to `build-portable-matrix.yml` with `tag_name` input.
- Auto-tag now reuses existing `HEAD` tag and still dispatches build/release flow.
- Replaced CLI-dependent dispatch call with `actions/github-script` API dispatch.
- Build jobs now checkout exact tag when provided via dispatch input.

### Prevention
- CI release chain must support two trigger modes:
  - `push.tags: v*`
  - explicit `workflow_dispatch` with target tag
- Auto-tag workflows must be idempotent and must dispatch release pipeline even if tag already exists on current commit.
- Any CI trigger fix must be documented in incident log before merge.

## 2026-03-28 - In-app update reliability and version mismatch

### Symptoms
- App showed outdated current version in update dialog compared to latest GitHub release.
- Update progress modal occasionally rendered as blank white window.
- After update apply, app closed but did not always relaunch.

### Root causes
1. Portable bundles did not consistently carry runtime version metadata aligned with release tags.
2. Update flow used `QProgressDialog` with poor rendering behavior in some runtime/theme states.
3. Windows updater relaunch command lacked explicit working directory and robust retry behavior.

### Fixes
- Added runtime version resolution hierarchy with bundle version file support (`voodoo_loader_version.txt`).
- Updated build scripts (Windows/Linux) to stamp portable bundles with resolved build version.
- Replaced update progress dialogs with explicit modal loader dialog for check/download/apply stages.
- Hardened Windows updater script with:
  - launch working directory
  - relaunch retries
  - updater log file (`voodoo_loader_updater.log`)
  - clear manual restart fallback message for user

### Prevention
- Added automated tests:
  - runtime version resolution (`tests/test_version_runtime.py`)
  - updater script/launch expectations (`tests/test_update_service.py`)
- Added/updated PRD and upgrade list requirements for update UX and version sync.
