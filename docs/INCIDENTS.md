# Incident Log

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