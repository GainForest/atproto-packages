# Bumicerts

Bumicerts is a Next.js App Router application in the monorepo.

## Core Working Rules

- Use `bun` for dependency management and scripts.
- Do not use npm or pnpm for this app.
- Read `AGENTS.md`, then `agents/README.md`, before making Bumicerts changes.
- Treat local Bumicerts docs as the source of truth for implementation patterns.

## Common Commands

```bash
bun install
bun run dev
bun run lint
bun run build
```

## Documentation Map

- `AGENTS.md` — highest-priority Bumicerts agent constitution
- `agents/README.md` — mandatory task-to-doc router after `AGENTS.md`
- `agents/DOC_MAINTENANCE.md` — when agent-facing docs should change and where
- `agents/ACTIVE_PATHS.md` — canonical ownership map and legacy redirects
- `agents/TESTING.md` — testing router and command selection
- `agents/CODE_RULES.md` — type safety, naming, utilities, comments
- `agents/REACT.md` — state, effects, hooks, component rules
- `agents/NEXTJS.md` — routes, loading, errors, server/client boundaries
- `agents/DATA.md` — validation, forms, env, queries, mutations
- `agents/DESIGN.md` — UI consistency, accessibility, design rules
- `agents/NEW_ROUTE.md` — new route conventions
- `agents/MODALS.md` — modal system usage
- `agents/UPLOAD_ROUTES.md` — `/upload/*` patterns
- `docs/ARCHITECTURE.md` — target architecture and migration direction
- `docs/DEPRECATIONS.md` — banned and legacy patterns
- `docs/decisions/README.md` — durable decisions and approved exceptions
- `docs/examples/README.md` — canonical examples to copy from

## Engineering Expectations

- Keep route files thin.
- Prefer Server Components by default.
- Use `nuqs` for query parameter state.
- Validate external input at boundaries.
- Reuse existing utilities and UI patterns before creating new ones.
- Avoid duplicate helpers, types, and component patterns.
- Prefer meaningful code over comments.

## Notes

- This README is intentionally brief.
- Implementation-specific rules live in the docs listed above.
