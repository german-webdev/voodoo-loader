# Contributing Guide

This repository uses a branch + PR workflow.
Direct commits to `master` are not allowed for feature work.

## 1. Branch Strategy

Create a development branch for every change from latest `master`.

Branch format:
- `dev/<type>/<short-name>`
- `dev/<type>/<ticket>-<short-name>`

Allowed `<type>`:
- `feat` - new functionality
- `fix` - bug fix
- `hotfix` - urgent production fix
- `refactor` - code cleanup without behavior change
- `test` - tests only
- `docs` - documentation only
- `chore` - maintenance/tooling
- `ci` - pipeline/configuration
- `release` - release prep

Examples:
- `dev/feat/update-checker`
- `dev/fix/drag-drop-row-loss`
- `dev/test/update-service`
- `dev/release/0.1.1`

## 2. Commit Message Format

Use Conventional Commits:

`<type>(<scope>): <short imperative summary>`

Where `<type>` is one of:
- `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`, `revert`

Examples:
- `feat(update): add GitHub Releases check flow`
- `fix(queue): prevent row loss during drag and drop`
- `test(update): cover semver comparison edge cases`
- `docs(prd): add update workflow requirements`

Rules:
- Summary length: up to ~72 characters.
- Use present tense, imperative style.
- One logical change per commit.

## 3. Required Pre-PR Checks

Before push / PR, run:

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv\Scripts\python.exe -m ruff check src tests
.\.venv\Scripts\python.exe -m pytest -q
```

If relevant, also run:

```powershell
.\.venv\Scripts\python.exe -m mypy src/voodoo_loader
```

## 4. Pull Request Rules

- Open PR from `dev/...` branch into `master`.
- PR title should follow commit style (recommended):
  - `feat(scope): ...`
  - `fix(scope): ...`
- Include test evidence and risk notes.
- Update `PRD.md` when behavior/requirements change.
- Update `CHANGELOG.md` for user-visible changes.

## 5. Release and Versioning

- Use SemVer: `MAJOR.MINOR.PATCH` with optional pre-release suffix (`-alpha`, `-beta`, `-rc`).
- Tags must match version: `vX.Y.Z` or `vX.Y.Z-alpha`.
- Each release must have patch notes in `CHANGELOG.md`.