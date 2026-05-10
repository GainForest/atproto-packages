# Decisions

Use this directory for durable architectural decisions, approved exceptions, and rule clarifications that future agents and humans should be able to find quickly.

## When to Add a Decision

Add a decision when:

- a one-off exception to the normal rules is approved
- a contested architecture choice is resolved
- a pattern is promoted to the preferred default
- an old pattern is explicitly deprecated
- the same confusion is likely to happen again

## What a Decision Is Not

Do not use this directory for:

- temporary notes
- implementation scratchpads
- long tutorials
- duplicate copies of existing architecture docs

## File Naming

Prefer concise names such as:

```text
YYYY-MM-DD-short-kebab-case-title.md
```

## Suggested Template

```md
# Decision: <title>

## Status
Accepted | Superseded | Deprecated

## Context
What problem or conflict existed?

## Decision
What was decided?

## Rationale
Why was this chosen over the alternatives?

## Scope
Where does this apply?

## Consequences
What should future contributors or agents do differently?

## Follow-up
Which docs, files, or patterns should be updated because of this?
```

## Usage Rule

If a user approves an exception to an existing Bumicerts rule and that exception is likely to recur, propose adding a decision note here.
