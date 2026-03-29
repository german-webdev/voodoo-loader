# Visual Regression Matrix

## Supported platforms

- Windows (`*-chromium-win32.png`)
- Ubuntu/Linux (`*-chromium-linux.png`)
- macOS (`*-chromium-darwin.png`)

## Local commands

- Smoke e2e: `npm run e2e:smoke`
- Visual e2e (current OS): `npm run e2e:visual`
- Update visual snapshots (current OS): `npm run e2e:visual:update`

## Linux snapshots from Windows (Docker)

- Verify against Linux baseline: `npm run e2e:visual:linux:docker`
- Update Linux baseline: `npm run e2e:visual:linux:docker:update`

## CI behavior

- `frontend-quality` runs smoke e2e on Ubuntu.
- `visual-regression` runs visual snapshot tests for each OS in matrix:
  - `windows-latest`
  - `ubuntu-latest`
  - `macos-latest`
- Per-OS job starts only when matching baseline files exist in `tests/e2e/visual-regression.spec.ts-snapshots`.

## Baseline maintenance rule

- Any visual UI change must update snapshots for all target platforms that are enabled in CI.
