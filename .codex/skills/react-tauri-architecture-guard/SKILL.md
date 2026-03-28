# Skill: React Tauri Architecture Guard

## Purpose
Enforce Feature-Sliced Design and clean React/Tauri boundaries during implementation.

## Scope
- FSD layering (`app/pages/widgets/features/entities/shared`)
- Avoid monolithic React files
- Tauri commands accessed through isolated model/hooks layer
- Error handling and testability

## Rules
- `app`: app shell, providers, bootstrap only.
- `pages`: page composition only.
- `widgets`: composed UI blocks.
- `features`: user actions and feature logic.
- `entities`: domain models and domain-level helpers.
- `shared`: reusable UI and low-level utilities.

## React Guardrails
- Move heavy side effects to custom hooks.
- Keep components focused and small.
- Reuse shared UI components for repeated controls.
- Keep forms validated and typed.
- Wrap app with `ErrorBoundary`.

## Tauri Guardrails
- Keep `invoke` integration centralized in model/hooks.
- Avoid calling backend directly from many presentational components.
- Validate command payloads and keep typed interfaces.

## Verification
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `cargo test` where backend tests exist
