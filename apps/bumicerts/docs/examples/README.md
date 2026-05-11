# Examples

This directory contains canonical examples that agents and humans should copy from when implementing new work.

## Start Here

| Need | Example |
|---|---|
| Route with static chrome plus one main dynamic block | `route-shell-pattern.md` |
| Query parameter state with `nuqs` | `nuqs-query-state.md` |
| App-global modal open and close flow | `global-modal-flow.md` |

## Purpose

Prose rules are not enough.

Examples reduce ambiguity and help prevent pattern drift.

## What Belongs Here

Add small, high-signal examples for patterns that should be repeated across the app, such as:

- a canonical route using the Shell pattern
- a canonical query parameter flow with `nuqs`
- a canonical server and client boundary
- a canonical schema-validated form flow
- a canonical optimistic mutation flow
- a canonical modal open and close flow
- a canonical shared UI composition pattern

## Example Rules

- Keep examples small.
- Keep examples generic and stateless.
- Prefer examples that demonstrate one pattern clearly.
- Update examples when the approved pattern changes.
- Agents should prefer copying these examples over inventing new shapes.

## Usage Rule

If a matching example exists here, copy it before inventing a new shape.

## Important

Examples are not a dumping ground for random snippets.

Each example should represent an approved pattern the app actually wants repeated.
