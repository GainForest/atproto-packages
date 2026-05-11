# Deprecations and Banned Patterns

This document defines what new code must not introduce, what legacy patterns may temporarily remain, and how to handle migration when touching old areas.

## Banned in New Code

Do not introduce new code that depends on:

- `any`
- `as any`
- casual unsafe casts
- non-null assertion spam
- duplicated utility functions
- duplicated type definitions for the same concept
- `setState` inside `useEffect` or other side effects
- manual query string state management instead of `nuqs`
- app-level raw Dialog and Sheet usage when the shared modal system is required
- hardcoded domains or public URLs
- hardcoded route strings when centralized link helpers should own them
- giant mixed-responsibility page components
- direct trust in external input without validation
- boolean prop explosions
- stale `new`, `old`, `final`, or `temp` component forks
- scattered one-off visual patterns that bypass shared UI conventions without reason

## Legacy but Tolerated Until Touched

These may exist in older code, but should not spread further:

- inconsistent folder placement in untouched legacy areas
- outdated naming drift in untouched legacy files
- duplicated helpers that have not yet been consolidated
- older query and mutation flows that are still being migrated
- older UI compositions that are scheduled for gradual replacement

## Migration Policy

When touching legacy code:

- do not expand the legacy pattern
- move the changed area one step toward the approved pattern
- reuse newer shared utilities if available
- rename or consolidate if doing so is safe and proportional
- avoid enormous drive-by rewrites unless explicitly requested

## Exception Process

If a banned pattern seems necessary:

1. stop and explain why
2. get explicit user approval
3. document the exception in `docs/decisions/`
4. avoid letting the exception silently become the new default

## Goal

Legacy code may remain temporarily.

Legacy patterns must not become the future direction of the app.
