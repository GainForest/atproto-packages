# Testing and Checks Router

Use this doc when the task is test or mixed, or when you must choose which checks to run.

## Hard Rules / Non-Negotiables

- Run the smallest relevant check that protects the changed behavior.
- If no relevant automated check exists, say so clearly and run the best available targeted check.

## Common Commands

Run these from `apps/bumicerts`.

| Need | Command |
|---|---|
| Lint | `bun run lint` |
| Type safety | `bun run typecheck` |
| Build | `bun run build` |

## Check Selection Rule of Thumb

- Docs-only changes: no runtime checks unless the docs change runnable commands or operational contracts.
- UI, route, config, or structural changes: run `bun run lint`, then `bun run build`.
- Logic changes with existing regression coverage: run `bun run lint`, `bun run typecheck`, and the closest relevant automated test if one exists.
- If no targeted test exists for the changed behavior, say so clearly.
