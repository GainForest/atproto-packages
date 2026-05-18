# Autoresearch: Re-establish Bumicerts E2E Tests

## Objective
Recreate the removed E2E suite with working, verifiable flows for:

- Auth flow
- Public pages (each public marketplace page)
- Successful bumicert creation
- Adding evidence to a bumicert evidence timeline

Every important step must produce screenshots. Evidence flows must produce video recordings. Prefer reusing authenticated browser state across authenticated flows when practical.

## Metrics
- **Primary**: evidence_assertions (count, higher is better) — meaningful assertions in the evidence timeline flow, while the full E2E suite must still pass.
- **Secondary**: e2e_unpassed_tests, e2e_failures, missing_required_flows, e2e_exit_code, screenshots_found, videos_found — correctness, coverage, and artifact monitors.

## How to Run
`./autoresearch.sh` — outputs `METRIC name=number` lines.

## Files in Scope
- `package.json` — E2E scripts and dependencies.
- `playwright.config.ts` — Playwright configuration if Playwright Test is used.
- `e2e/**` — E2E tests, fixtures, setup, screenshots/video artifact configuration.
- `.gitignore` and `eslint.config.mjs` — generated E2E output exclusions only if needed.
- `autoresearch*` — experiment harness files.

## Off Limits
- Do not rewrite application product flows unless an E2E-only hook or accessibility selector is strictly required.
- Do not edit generated reports/screenshots/videos as source.
- Do not add hardcoded public app URLs outside E2E configuration.

## Constraints
- Use `bun` only.
- Avoid tiny step-by-step loops: write complete test coverage first, then patch based on failures.
- Tests must record screenshots at important checkpoints.
- Evidence flows must record videos.
- Auth-gated flows should reuse auth state from the auth flow if possible.
- Keep the suite deterministic enough for local execution, with clear skips or env contracts for unavailable external services.

## What's Been Tried
- Baseline: previous session removed the old Cucumber/Playwright E2E suite and docs because it was stale and outdated.
- Rebuilt a first-pass Playwright Test suite with auth setup, public page coverage, bumicert creation, and evidence timeline tests. Next iterations must verify the actual suite, inspect screenshots/traces, and patch failures in batches.
- Correctness target reached and repeatedly confirmed: the Playwright suite passes with `e2e_unpassed_tests=0`. New target is strengthening evidence timeline assertions without breaking the suite or adding benchmark-only checks.
