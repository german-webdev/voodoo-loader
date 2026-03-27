# Changelog

All notable changes to Voodoo Loader are documented in this file.

The format follows Keep a Changelog principles and Semantic Versioning.

## [Unreleased]
### Added
- QA gate scripts for local validation: `scripts/qa_gate.ps1` and `scripts/qa_gate.sh`.
- Git hook installers and pre-push hook gate (`scripts/install_git_hooks.ps1`, `scripts/install_git_hooks.sh`, `.githooks/pre-push`).
- CI workflow `.github/workflows/qa-gate.yml` for pull requests and pushes to `master`/`dev/**`.

### Changed
- Development workflow now enforces QA-before-push and QA-before-merge via local hooks and GitHub checks.
- Portable artifact naming now includes version, OS, architecture, and package type.
- In-app updater asset selection now prefers runtime OS/architecture specific release files.

### Known Issues
- Windows x86 build is deferred with current PySide6/Qt6 stack.

## [0.1.0-alpha] - 2026-03-28
### Added
- Queue-based downloader architecture on top of aria2.
- RU/EN localization with in-app language switch.
- Authentication modes: none, token+headers, login/password.
- Queue context menu actions, priority controls, retry/remove operations.
- Progress panel with accordion (more/less details).
- Sound notifications for start/success/failure.
- Portable build pipeline with PyInstaller.
- Help menu with modal About dialog.
- In-app GitHub Releases update flow with modal check/download/confirm UX.
- Update service with semantic version comparison and optional SHA256 verification.

### Changed
- Product naming unified to `Voodoo Loader`.
- Menu layout standardized: File / Downloads / View / Settings / Help.
- Start-path reliability hardening for download options creation.

### Fixed
- Portable startup relative-import crash.
- Queue drag-and-drop instability (row disappearance, source mismatch, reorder corruption).
- Queue readability in dark theme.
- Sound playback reliability in portable runtime.
- Select-column redundant text in queue rows (checkbox-only cells).

### Known Issues
- Update repository must be configured (`VOODOO_LOADER_GITHUB_REPOSITORY` env var or `update_repository` in settings) before in-app updater can query releases.
- GitHub API rate-limits can temporarily block update checks.
