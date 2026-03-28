# Skill Gates

Use these local skills before merging UI or architecture-heavy changes:

1. `/.codex/skills/design-qa-storybook/SKILL.md`
2. `/.codex/skills/react-tauri-architecture-guard/SKILL.md`

## Design Gate
- Build Storybook.
- Run Playwright smoke.
- Review stories for typography, spacing, overlap, and contrast regressions.

## Architecture Gate
- Verify FSD boundaries and no monolithic app file.
- Ensure Tauri command usage stays in model/hooks, not scattered in UI.
- Verify `ErrorBoundary` remains active at app root.
