# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [0.2.0] - 2026-04-06

### Added

- Production-ready Tauri v2 desktop application baseline.
- Queue grid improvements: drag-and-drop reorder, resize behavior, and improved alignment.
- Visual regression coverage for queue empty state.
- CI workflows for frontend quality, visual regression, rust checks, and release tagging.

### Changed

- Stabilized visual snapshot tests for the `Download queue` block.
- Improved accessibility for resize handles with visible keyboard focus.
- Updated queue layout spacing, column alignment, and footer metrics presentation.
- Unified release policy on `master` to stable SemVer versions only.

### Fixed

- Flaky Playwright snapshots in queue section due to layout jitter.
- Teardown resize callback behavior that could trigger unnecessary state updates.
- Version policy mismatch on `master` (`alpha` version replaced with stable release).

## [0.2.0-alpha.1] - 2026-03-29

### Added

- Initial Tauri v2 migration implementation with React + TypeScript frontend.
- FSD-based project structure for pages/widgets/entities/shared.
- Storybook, Jest, Playwright, and pre-commit/pre-push quality gates.

## [0.1.0-alpha] - 2026-03-28

### Added

- Early application functionality and UI foundation.
- Basic queue operations and settings dialogs.

