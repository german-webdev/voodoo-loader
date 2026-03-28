# Skill: Design QA Storybook

## Purpose
Use this skill to review visual quality and snapshot stability for UI changes in Voodoo Loader.

## Scope
- Shared UI component stories
- Storybook build quality
- Playwright screenshot/snapshot checks
- Layout regressions (overlap, clipping, spacing, poor contrast)

## Workflow
1. Run `npm run storybook:build`.
2. Run `npm run e2e`.
3. Inspect stories for:
   - typography consistency,
   - color contrast,
   - broken alignment,
   - overflow and overlap,
   - mobile and narrow width behavior.
4. If visual regression found:
   - add/adjust story,
   - add snapshot/e2e assertion,
   - re-run checks.

## Quality Gates
- Storybook builds successfully.
- At least one story exists for each shared UI component.
- Playwright smoke test passes.
- No obvious visual overlap or unreadable text in stories.
