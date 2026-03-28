# Voodoo Loader Tauri: Implementation Checklist

Updated: 2026-03-28
Owner: Codex + maintainer
Target baseline: `0.2.0-alpha`

## 1. Engineering Foundation

- [x] Add ESLint (TS + React hooks + import order rules)
- [x] Add Prettier and unified formatting script
- [x] Add Husky hooks (`pre-commit`, `pre-push`)
- [x] Add `lint-staged` for staged file checks
- [x] Add strict TypeScript checks and CI command gates
- [x] Add dependency scripts for dev, test, e2e, storybook, build

Acceptance:
- `npm run lint` passes
- `npm run format:check` passes
- hooks block bad commits/pushes locally

## 2. FSD Refactor (Frontend)

- [x] Introduce FSD directories (`app`, `pages`, `widgets`, `features`, `entities`, `shared`)
- [x] Split monolithic `src/App.tsx` into small modules
- [x] Extract business logic into custom hooks
- [x] Add shared UI library (`Button`, `Input`, `Select`, `Modal`, etc.)
- [x] Add `ErrorBoundary` at app provider layer
- [x] Keep product naming as `Voodoo Loader` everywhere

Acceptance:
- Main flows work after refactor
- No critical logic remains hardcoded in one file
- Shared UI components are reused in multiple places

## 3. Product Function Parity

- [ ] Queue add/start/stop/retry/remove parity with old behavior
- [ ] Multi-download execution and queue concurrency controls
- [ ] Progress panel includes total size and aggregate progress stats
- [ ] Drag-and-drop queue reorder
- [ ] Context menus in queue and menu bar parity
- [ ] Settings placement parity (auth, speed, max connections/server, continue/resume)
- [ ] Header layout parity and sticky behavior on scroll

Acceptance:
- Functional parity checklist passes on manual QA
- No regressions against agreed update list

## 4. Test Platform

- [x] Configure Jest + React Testing Library
- [x] Add coverage report command and thresholds
- [x] Add Playwright e2e project for desktop UI flows
- [x] Add snapshot tests for shared UI and key widgets
- [x] Add Storybook and stories for shared UI kit
- [x] Add backend (Rust) unit tests for queue helpers/logic where possible

Acceptance:
- `npm run test` and `npm run test:coverage` pass
- `npm run e2e` passes in CI profile
- `npm run storybook:build` passes
- `cargo test` passes

## 5. Agent/Skill Artifacts

- [x] Add design QA agent guide (fonts/colors/layout overlap/snapshot review)
- [x] Add architecture QA agent guide (FSD boundaries + React/Tauri contract checks)
- [x] Document when to run each agent gate in PR workflow

Acceptance:
- Guides are versioned in repo and referenced in CONTRIBUTING

## 6. CI/CD and Versioning

- [x] Build full QA workflow for `development` and `master`
- [x] Add lint/test/build + Rust checks + Storybook build + e2e smoke jobs
- [x] Add release workflow with tagging strategy from `0.2.0-alpha`
- [ ] Add changelog/version bump policy

Acceptance:
- Green pipeline on both branches
- New tags are generated consistently
- Release artifacts are attached and traceable

## 7. Delivery Discipline

- [ ] Work in feature branches from `development`
- [ ] Commit by phases (small, reversible increments)
- [ ] Open PR per phase with checklist updates
- [ ] Keep rollback-safe history

Acceptance:
- Every merged PR references checklist items closed in that phase
