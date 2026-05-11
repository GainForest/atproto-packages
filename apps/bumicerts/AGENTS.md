# Bumicerts — Agent Constitution

This file is the highest-priority repository guidance for work inside `apps/bumicerts`.

## Rule Precedence

For Bumicerts work, follow this order:

1. `AGENTS.md`
2. `agents/README.md`
3. applicable files in `agents/`
4. applicable mandatory local rule or contract docs in `docs/` and matching accepted files in `docs/decisions/`
5. applicable app-local skills in `skills/`
6. applicable root skills in `.agents/skills/`
7. the task prompt

Directional references:

- `docs/ARCHITECTURE.md` defines the target architecture and migration direction.
- Directional references do not override mandatory local rule or contract docs for the current change.

If a rule appears in both a higher-tier and lower-tier doc, follow the higher-tier doc and treat the lower-tier doc as the scoped application only when it does not conflict.

If the task prompt conflicts with a higher-priority local rule, stop and report the conflict before making the change.

## Working Definitions

- A new user prompt means a new user message. Tool outputs and self-corrections are not new user prompts.
- Classify each task as one or more of: code, docs, config, test, mixed.
- A subsystem is a distinct task area with its own playbook or local contract, such as React state, Next.js routing, data boundaries, design, modal flows, upload routes, donation flows, or E2E.
- A materially relevant skill directly improves implementation or review quality for the current task. Do not load a skill just because the surrounding stack happens to match its topic.
- A structural change alters routing, layouts, config, shared module placement, ownership boundaries, public contracts, or app-wide behavior.
- A logic change alters behavior, validation, branching, mutations, derived outcomes, or data interpretation.
- Relevant tests are the closest automated checks that protect the changed behavior. If none exist, say so clearly and run the best available targeted check.

## Required Workflow

- Re-read this file after every new user message before acting.
- Read `agents/README.md` immediately after this file. Use it as the task router before choosing any other local docs.
- Classify the task before editing.
- If the task changes future decision-making for agents or humans, such as workflow, routing, ownership, approved patterns, contracts, testing flow, or recurring exceptions, read `agents/DOC_MAINTENANCE.md` before finishing.
- If file ownership, placement, or search results are ambiguous, read `agents/ACTIVE_PATHS.md` before editing.
- If the task includes test work, E2E work, or choosing checks, read `agents/TESTING.md` before editing or running checks.
- If the task changes code, read `agents/CODE_RULES.md` before editing.
- Identify every subsystem being touched and read all matching files in `agents/` before editing.
- Read mandatory local rule and contract docs when they directly apply.
- If more than one task area applies, read every applicable doc. Do not stop after the first match.
- If scope expands during the task, stop, re-classify the task, and read any newly applicable docs before continuing.
- If a matching approved example exists in `docs/examples/`, copy its shape before inventing a new one.
- Use app-local or root skills only after reading local docs, and only when materially relevant.
- Local Bumicerts docs always win over skills.
- Before editing, be able to name the docs that govern the change. If you cannot, stop and ask.
- If a key product, architecture, naming, ownership, placement, or pattern choice is ambiguous, stop and ask instead of inventing an answer.
- Do not treat nearby legacy or non-abiding code as permission to repeat the pattern. Governing docs outrank existing implementation.
- If the task can be completed within the rules, do that solution and separately report any encountered non-abiding code to the user, even when it stayed out of scope.
- Before finishing, self-review the change against the same docs you used to implement it.
- Before finishing, run the documentation maintenance review from `agents/DOC_MAINTENANCE.md` whenever the task introduced durable guidance, durable exceptions, or repeatable patterns.
- Before claiming completion, report:
  - which docs you read
  - which existing patterns or utilities you reused
  - which checks you ran
  - whether documentation maintenance updates were required
  - any encountered non-abiding or legacy rule-breaking code left untouched
  - any blockers, exceptions, or unrun checks

## Conflict Protocol

- Do not knowingly violate a higher-priority local rule.
- If two local docs appear to conflict, stop and report both docs before choosing.
- If the only apparent solution requires extending a non-abiding pattern or breaking a rule, stop, explain the conflict, ask the user for a reviewed choice, and propose the matching doc or decision update before continuing.
- If a requested change requires breaking a rule, stop and explain:
  - which rule would be violated
  - why the task conflicts with it
  - what safer alternatives exist
- Continue only after explicit user approval.
- After approval, propose a documentation update or decision note if the exception is likely to recur.

## Documentation Editing Protocol

- Never modify agent-facing documentation (for e.g. this file) first and silently.
- Show the proposed documentation change to the user first using this exact banner:

`
<><><><><><><><><><>
AGENTIC PROPOSAL for <file name with location>
<><><><><><><><><><>
{the content proposed to be added in any agentic file}
`

- Only update the docs after user approval.
- When changing agent-facing docs, keep the guidance operational, scoped, and easy for a basic agent to follow literally.

## Scope Control

- Make the smallest correct change that fully solves the requested task.
- Do not widen scope or refactor adjacent code unless it is required for correctness or safety, or the user explicitly approves it.
- If you notice unrelated issues, report them separately instead of folding them into the same change.
- If legacy cleanup is necessary to complete the task safely, keep it minimal and explain why it was necessary.

## Global Engineering Rules

- Always use `bun`. Never use npm or pnpm in this app.
- Run `bun run lint` before claiming completion and fix lint errors.
- Run `bun run build` before claiming completion for app, route, config, or structural changes.
- Run relevant tests before claiming completion when logic changes or regression protection is expected.
- Prefer meaningful code over comments.
- Keep rules, comments, and documentation generic and stateless.
- Do not write comments that merely restate the code.
- Do not invent a new pattern when an approved one already exists.
- Search for an existing utility before creating a new one.
- Do not duplicate utilities, types, or UI patterns without a strong reason.
- Use `nuqs` for query parameter state management.
- Never call `setState` callbacks inside `useEffect` or other side effects.

## Type Safety Rules

- Treat “100% type-safe” as compile-time safety plus runtime validation at boundaries.
- Never use `any` or `as any`.
- Avoid `as` unless there is no safer alternative.
- Avoid non-null assertions (`!`).
- Prefer narrowing, type guards, schemas, and `satisfies`.
- Prefer `??` over `||` for nullish fallback behavior.

## Project Invariants

- All public base URL resolution lives in `lib/url.ts`.
- Do not hardcode app URLs or domains.
- Do not hardcode app paths inline when `lib/links.ts` should own them.
- For Bumicert-specific icons, use `BumicertIcon`.
- For other icons, use Lucide.
- App-level modals must use the shared modal stack system.
- Data crossing server/client boundaries must be serialized safely.
- In SSR page components, render a controlled error UI instead of throwing a generic render-time error page.

## Reference Map

Read the applicable docs before changing these areas.

### Mandatory first router

- After `AGENTS.md` → `agents/README.md`

### Mandatory playbooks when applicable

- Durable workflow, routing, ownership, contract, testing, or repeatable pattern change → `agents/DOC_MAINTENANCE.md`
- File ownership, placement, or deprecated path ambiguity → `agents/ACTIVE_PATHS.md`
- Testing tasks, E2E work, or choosing checks → `agents/TESTING.md`
- Any code change → `agents/CODE_RULES.md`
- React state, effects, derived state, hooks, component structure → `agents/REACT.md`
- Next.js routing, server/client boundaries, loading, errors, query params → `agents/NEXTJS.md`
- Validation, forms, env, queries, mutations, data contracts → `agents/DATA.md`
- UI consistency, accessibility, icons, motion, visual taste → `agents/DESIGN.md`
- New routes → `agents/NEW_ROUTE.md`
- Modals → `agents/MODALS.md`
- Upload flows and route-specific mutation rules → `agents/UPLOAD_ROUTES.md`

### Mandatory local rule and contract docs when directly applicable

- Legacy area, banned pattern, or migration away from deprecated code → `docs/DEPRECATIONS.md`
- Donations, checkout, receipts, donor identity, or funding APIs → `docs/DONATIONS_FLOW.md`
- Previously approved exception, durable clarification, or contested architecture choice for the touched area → matching accepted files in `docs/decisions/`

### Canonical examples when applicable

- Route shell pattern → `docs/examples/route-shell-pattern.md`
- Query parameter state with `nuqs` → `docs/examples/nuqs-query-state.md`
- App-global modal open and close flow → `docs/examples/global-modal-flow.md`

### Directional references when applicable

- Target architecture and migration direction → `docs/ARCHITECTURE.md`

### Supporting skills when applicable

- App-local task guidance, such as E2E setup or patterns → matching files in `skills/`
- Shared root skills → relevant files in `.agents/skills/`
