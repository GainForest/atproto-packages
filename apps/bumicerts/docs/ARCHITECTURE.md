# Bumicerts Architecture

This document describes the target architecture for Bumicerts. It is the migration direction for refactors and the default shape for new code.

## Goals

- scalable
- predictable
- type-safe
- testable
- easy to review
- hard to misuse

## Architectural Principles

- Server-first by default.
- Runtime validation at boundaries.
- Feature-oriented organization over unrelated global dumping grounds.
- Shared code must be intentionally shared.
- One approved pattern per problem category is better than many competing patterns.
- No new debt.

## Code Shape

Prefer separating concerns into these layers:

- route composition
- feature UI
- server/data access
- schemas and validation
- shared utilities
- shared UI primitives

A feature or route-adjacent module may contain shapes like:

```text
<feature>/
  components/
  server/
  schemas/
  hooks/
  lib/
  tests/
```

The exact names may vary, but the responsibilities should stay clear.

## Ownership Rules

### Route files

- compose the page
- wire data into UI
- stay thin

### Feature UI

- render views
- handle local interaction state
- avoid owning domain write logic directly

### Server and data modules

- fetch or mutate data
- validate external input
- apply business rules
- return clear contracts

### Shared modules

- exist only when the code is genuinely shared
- expose intentional public APIs
- avoid becoming a dumping ground

## Approved Patterns

| Area | Approved Pattern | Avoid |
|---|---|---|
| Query params | `nuqs` | manual router and string state management |
| Server and client split | server-first, client only when needed | broad client-only pages by default |
| Route loading | `loading.tsx` + mirrored skeletons | blank waits or inconsistent placeholders |
| Static chrome + one main dynamic block | Shell pattern | ad hoc bespoke loading patterns everywhere |
| Modals | shared modal stack system | raw app-level Dialog and Sheet usage |
| Paths | centralized link helpers | hardcoded path strings everywhere |
| Public URL | centralized URL helpers | raw env reads or hardcoded domains |
| Validation | schema at boundary | trusting external input |
| State ownership | local UI state, URL state, query cache, or server ownership chosen intentionally | duplicated mirrored state |
| Shared UI | shared primitives and approved composed patterns | one-off replacements without reason |
| ATProto edit flows | explicit `update` vs `upsert` choice | using `upsert` for routine partial edits |

## Migration Rules

- Do not rewrite the app blindly.
- Refactor toward the target architecture in slices.
- When touching a legacy area:
  - improve it one step toward the target
  - do not spread the legacy pattern further
  - do not introduce a second new pattern beside it
- Delete obsolete files when their replacements are live.
- If an exception is necessary, document it under `docs/decisions/`.

## How to Use This Doc

- `AGENTS.md` owns agent workflow, rule precedence, and completion protocol.
- This document owns target architecture, approved patterns, and migration direction.
- If this document and the current code differ, move the touched area one step toward this target without broad rewrite.
- If this document seems to conflict with a mandatory local rule or contract doc, follow the mandatory local doc for the current change and report the conflict.

## Success Criteria

A good Bumicerts change should make the app more:

- consistent
- explicit
- typed
- validated
- composable
- reviewable
- deletable
