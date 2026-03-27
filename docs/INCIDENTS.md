# Incident Log

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
