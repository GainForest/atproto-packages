# Bumicerts Agent Docs Router

Use this file immediately after reading `../AGENTS.md`.

It is the mandatory task router before any other local docs.

## Quick Procedure

1. Re-read `../AGENTS.md` after every new user message.
2. Read this file immediately after `../AGENTS.md`.
3. Classify the task as code, docs, config, test, or mixed.
4. If the task changes future decision-making for agents or humans, such as workflow, routing, ownership, approved patterns, contracts, testing flow, or recurring exceptions, read `DOC_MAINTENANCE.md`.
5. If file ownership, placement, or search results are ambiguous, read `ACTIVE_PATHS.md`.
6. If the task includes test work, E2E work, or choosing checks, read `TESTING.md`.
7. If the task changes code, read `CODE_RULES.md`.
8. Identify every subsystem being touched.
9. Read every matching playbook in this folder. Rows stack.
10. Read mandatory local rule or contract docs when they directly apply.
11. If a matching approved example exists in `../docs/examples/`, copy its shape before inventing a new one.
12. If scope expands, stop, re-classify the task, and read any newly applicable docs before continuing.
13. Use supporting skills only after local docs, and only when they directly improve the task.
14. If a key product, architecture, naming, ownership, placement, or pattern choice is ambiguous, ask instead of inventing an answer.
15. Make the smallest correct change, then self-review against the same docs before finishing.
16. Before claiming completion on a substantial task, decide whether any agentic docs must be updated by applying `DOC_MAINTENANCE.md`.

## Task → Playbooks

| Task | Read |
|---|---|
| Durable workflow, routing, ownership, contract, testing, or repeatable pattern change | `DOC_MAINTENANCE.md` |
| File ownership, placement, or deprecated path ambiguity | `ACTIVE_PATHS.md` |
| Testing task, E2E work, or choosing checks | `TESTING.md` |
| Any code change | `CODE_RULES.md` |
| React component, hook, local state, effects | `REACT.md` |
| Route, page, layout, loading, error, server/client split | `NEXTJS.md` |
| Validation, forms, env, query/mutation logic, API boundaries | `DATA.md` |
| UI refinement, consistency, accessibility, icons, motion | `DESIGN.md` |
| New route creation | `NEW_ROUTE.md` |
| Modal work | `MODALS.md` |
| `/upload/*` work | `UPLOAD_ROUTES.md` |

Rows stack. For example, a new `/upload/*` route with client interactivity may require `CODE_RULES.md`, `NEXTJS.md`, `DATA.md`, `REACT.md`, `NEW_ROUTE.md`, and `UPLOAD_ROUTES.md`.

## Mandatory Local Rule and Contract Docs

| Trigger | Read |
|---|---|
| Legacy area, deprecated code, or banned pattern | `../docs/DEPRECATIONS.md` |
| Donations, checkout, receipts, donor identity, or funding APIs | `../docs/DONATIONS_FLOW.md` |
| Approved exception, durable clarification, or contested architecture choice for the touched area | matching accepted files in `../docs/decisions/` |

## Directional References

| Need | Read |
|---|---|
| Target architecture and migration direction | `../docs/ARCHITECTURE.md` |

## Canonical Examples

| Need | Read |
|---|---|
| Route with static chrome plus one main dynamic block | `../docs/examples/route-shell-pattern.md` |
| Query parameter state with `nuqs` | `../docs/examples/nuqs-query-state.md` |
| App-global modal open and close flow | `../docs/examples/global-modal-flow.md` |

## Supporting Skills

| Need | Read |
|---|---|
| E2E framework scaffolding or restructuring after local testing docs | `../skills/e2e.md` |
| React implementation, refactor, or performance guidance after local docs when materially relevant | `../.agents/skills/vercel-react-best-practices/SKILL.md` |
| Next.js framework guidance after local docs when materially relevant | `../.agents/skills/next-best-practices/SKILL.md` |
| Frontend visual/design execution after local docs when materially relevant | `../.agents/skills/frontend-design/SKILL.md` |
| Shared skill guidance after local docs | relevant files in `../.agents/skills/` |

## Rule of Thumb

- `AGENTS.md` is the constitution and owns workflow.
- This file is the mandatory router immediately after `AGENTS.md`.
- `DOC_MAINTENANCE.md` decides when agentic docs should change and where that update belongs.
- `ACTIVE_PATHS.md` resolves canonical ownership and legacy redirects.
- `TESTING.md` resolves what to run and which test docs matter.
- `CODE_RULES.md` is the default playbook for every code change.
- Files in `agents/` are task-specific playbooks.
- Matching files in `docs/` can be mandatory local rules or contracts when directly applicable.
- `ARCHITECTURE.md` guides migration direction, not shortcut the local workflow.
- If a matching example exists in `docs/examples/`, copy it before inventing a new shape.
- Use the exact skill path in `../.agents/skills/` when a local doc tells you to load a root skill.
- For React work, prefer `vercel-react-best-practices` after local docs when it materially improves the task.
- For Next.js work, prefer `next-best-practices` after local docs when it materially improves the task.
- For UI/design work, prefer `frontend-design` after local docs when it materially improves the task.
- Skills support implementation only when directly useful after local docs.
