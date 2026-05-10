# Testing and Checks Router

Use this doc when the task is test or mixed, or when you must choose which checks to run.

## Hard Rules / Non-Negotiables

- Do not edit generated test artifacts in `e2e/.e2e-dist/` or `reports/`.
- Run the smallest relevant check that protects the changed behavior.
- If the task changes E2E structure, setup, or scaffolding, read `../skills/e2e.md` after this file.
- For `bun run test:e2e` commands, start the Bumicerts dev server first.
- If no relevant automated check exists, say so clearly and run the best available targeted check.

## Which Doc to Read

| Need | Read | Why |
|---|---|---|
| Agent-facing test routing and command selection | `TESTING.md` | Start here before choosing checks. |
| Current E2E suite structure and existing steps | `../e2e/README.md` | Shows the live suite layout and common step definitions. |
| Exact command recipes, tags, and auth-state behavior | `../e2e/TESTING_GUIDE.md` | Deep command matrix and troubleshooting. |
| Shortest startup reminder | `../e2e/QUICK_START.md` | Minimal preflight for running the suite. |
| E2E framework scaffolding or restructuring | `../skills/e2e.md` | Framework architecture and copy-first setup guidance. |

## Source of Truth for Test Files

| Need | Path |
|---|---|
| E2E feature files | `../e2e/features/*` |
| E2E step definitions | `../e2e/step-definitions/*` |
| E2E support runtime | `../e2e/support/*` |
| E2E env template | `../e2e/.env.example` |
| Generated E2E output, do not edit | `../e2e/.e2e-dist/*` |
| Reports and screenshots, do not edit | `../reports/*` |

## Common Commands

Run these from `apps/bumicerts`.

| Need | Command |
|---|---|
| Lint | `bun run lint` |
| Type safety | `bun run typecheck` |
| Build | `bun run build` |
| Full E2E suite | `bun run test:e2e` |
| Headless E2E suite | `bun run test:e2e:headless` |
| One feature file | `bun run test:e2e e2e/features/explore.feature` |
| One scenario by name | `bun run test:e2e --name "full flow"` |
| Tag subset | `bun run test:e2e --tags "@smoke"` |
| Visible browser override | `E2E_HEADLESS=false bun run test:e2e --name "edit"` |

## E2E Preflight

1. In one terminal, run `bun dev` from `apps/bumicerts`.
2. Wait for the app to be reachable at `http://localhost:3001`.
3. In another terminal, run the chosen `bun run test:e2e ...` command.

## Check Selection Rule of Thumb

- Docs-only changes: no runtime checks unless the docs change runnable commands or operational contracts.
- UI, route, config, or structural changes: run `bun run lint`, then `bun run build`, plus the closest relevant automated test if one exists.
- Logic changes with existing regression coverage: run `bun run lint`, `bun run typecheck`, and the closest relevant automated test.
- E2E-only changes: run the smallest relevant `bun run test:e2e ...` command that exercises the changed behavior.

## Auth State Reminder

- Authenticated E2E scenarios reuse saved browser state from `e2e/.auth/user.json`.
- If auth state is stale, delete that file and rerun the relevant `@auth` scenario.
