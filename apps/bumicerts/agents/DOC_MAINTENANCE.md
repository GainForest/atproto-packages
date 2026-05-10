# Documentation Maintenance Policy

Use this doc when a task changes future decision-making for agents or humans.

## Hard Rules / Non-Negotiables

- Update or create agentic docs only when the change affects future decisions, not just the current implementation.
- If a future basic agent would likely choose the wrong doc, wrong file, wrong check, wrong pattern, or invent a rule without the update, the docs need to change.
- Prefer updating an existing doc when the scope already fits. Create a new doc only when the guidance is scoped, repeatable, durable, and would otherwise make an existing doc noisy.
- Keep agent-facing guidance operational, durable, and easy to follow literally.
- Follow the `AGENTS.md` documentation editing protocol before changing any agent-facing doc.

## Core Test

Ask this question:

> Without a doc update, would a future basic agent likely make the wrong choice, miss required context, or invent a pattern?

If yes, update the docs.

## Trigger → Update Map

| If the change affected... | Update or create... |
|---|---|
| Cross-cutting workflow, precedence, completion protocol, or global invariant | `../AGENTS.md` |
| Doc routing or “which doc to read next” behavior | `README.md` in this folder |
| Canonical ownership, placement, renamed sources, shims, or legacy redirects | `ACTIVE_PATHS.md` |
| Check selection, test workflow, test commands, or source-of-truth test locations | `TESTING.md` |
| Approved rules for a subsystem like React, Next.js, data, design, modals, upload routes, or new routes | the matching file in this folder |
| Business or behavior contract for the app | the matching file in `../docs/` |
| New banned pattern, tolerated legacy pattern, or migration-away rule | `../docs/DEPRECATIONS.md` |
| Approved recurring exception or durable clarification | a matching accepted file in `../docs/decisions/` |
| A pattern that should be copied instead of reinvented | a matching file in `../docs/examples/` |
| A complex recurring execution workflow that benefits from acceleration but is not baseline policy | a matching file in `../skills/` |

## When to Create a New File

Create a new doc only when all or most are true:

- the guidance is scoped to one subsystem or one recurring problem
- the guidance is repeatable across future tasks
- the guidance is stable enough to outlive one implementation
- adding it to an existing doc would blur responsibilities or make that doc noisy
- it can be routed cleanly from `README.md` in this folder

Good candidates:

- a new subsystem playbook
- a new ownership map section that has become too large for one file
- a new business contract doc
- a new decision note
- a new canonical example
- a narrow execution skill for a recurring hard task

## When Not to Update Agentic Docs

Do not update agentic docs for:

- one-off implementation details
- temporary debugging notes
- local refactors that do not change future decisions
- unstable experiments
- code facts that are obvious from the implementation and do not change agent choices
- transient project status updates

## End-of-Task Review

Before claiming completion on a substantial task, ask:

1. Did workflow or precedence change?
2. Did doc routing change?
3. Did canonical ownership move or did a new shim or legacy trap appear?
4. Did the approved pattern for a subsystem change?
5. Did a business or behavior contract change?
6. Did check selection, test flow, or test commands change?
7. Did we approve an exception that is likely to recur?
8. Did a pattern become worth copying as an example?
9. Did a recurring complex execution workflow become worth capturing as a skill?

If any answer is yes, propose the relevant doc update before completion.

## Maintenance Rule of Thumb

- Use `AGENTS.md` for constitution-level workflow.
- Use files in this folder for agent playbooks and routing.
- Use `../docs/` for app contracts and architecture.
- Use `../docs/examples/` for copyable approved shapes.
- Use `../docs/decisions/` for approved recurring exceptions and durable clarifications.
- Use `../skills/` for execution acceleration, not baseline discipline.
