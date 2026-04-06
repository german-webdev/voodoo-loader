# Voodoo Loader

Voodoo Loader is a cross-platform desktop download manager built with Tauri v2, React 19, and TypeScript.

## What It Does

- Adds direct links to a queue and runs downloads through aria2.
- Supports queue controls: start, pause, stop, retry, remove, priority.
- Supports drag-and-drop reorder for queue rows.
- Shows progress, speed, ETA, and logs in one desktop UI.
- Provides settings for authentication and aria2 behavior.

## Tech Stack

- Tauri v2 (Rust backend + desktop shell)
- React 19 + TypeScript
- Webpack
- Redux Toolkit
- Playwright, Jest, React Testing Library, Storybook

## Project Layout

- App source: `VoodooLoader.Tauri/`
- Rust backend: `VoodooLoader.Tauri/src-tauri/`
- E2E tests: `VoodooLoader.Tauri/tests/e2e/`

## Run Locally

Prerequisites:

- Node.js 22+
- Rust toolchain
- Tauri prerequisites for your OS

Commands:

```bash
cd VoodooLoader.Tauri
npm ci
npm run tauri dev
```

## Build

Production build:

```bash
cd VoodooLoader.Tauri
npm run build
```

Portable build (Windows local script):

```bash
cd VoodooLoader.Tauri
npm run release:portable
```

## Quality Checks

```bash
cd VoodooLoader.Tauri
npm run lint
npm run typecheck
npm run test
npm run e2e:visual
```

