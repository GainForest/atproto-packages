# Code Rules

These are the default code quality rules for Bumicerts.

## Core Philosophy

- Consistency beats cleverness.
- Composition beats inheritance.
- Clear module boundaries beat convenience imports.
- Meaningful code beats explanatory comments.
- Reuse beats duplication.
- Delete dead code instead of preserving parallel versions.

## TypeScript Rules

- Treat type safety as compile-time guarantees plus runtime validation at boundaries.
- Never use `any`.
- Never use `as any`.
- Avoid `as` unless there is no safer alternative.
- Avoid non-null assertions (`!`).
- Prefer `unknown` at unsafe boundaries, then narrow it.
- Prefer `satisfies` over casts when checking object shape.
- Prefer discriminated unions over boolean-state combinations.
- Prefer literal unions over loose string types.
- Use exhaustive switching for union logic.
- Keep exported APIs explicit.
- Let obvious local variables infer naturally.
- Model nullability honestly.
- Separate:
  - domain types
  - transport types
  - UI/view types
- Do not force fake type reuse through deep inheritance or broad extension chains.

## Module and File Rules

- Keep route files thin.
- Keep UI rendering separate from business logic and data access.
- Co-locate feature-specific code.
- Put shared code in explicit shared locations only when it is truly shared.
- Avoid circular dependencies.
- Avoid reaching into another module’s private internals.
- Respect monorepo package and app boundaries.
- Prefer small focused modules over giant mixed-responsibility files.
- Do not create parallel `new`, `old`, `final`, or `temp` implementations.

## Utilities

- Search for an existing utility before creating a new one.
- Reuse existing utilities instead of redefining equivalent helpers locally.
- Keep generic utilities generic.
- Keep domain-specific helpers near the domain they serve.
- Do not hide business logic inside vague utility modules.
- If a helper is used once and hurts readability, inline it instead.

## Naming

- Name by responsibility, not by history.
- Keep file names, exported symbols, and component names aligned.
- Hooks start with `use`.
- Avoid vague names like:
  - `helper`
  - `utils2`
  - `temp`
  - `new`
  - `final`
  - `data`
- Rename stale names during meaningful refactors instead of preserving drift forever.

## Comments

- Comments must be generic and stateless.
- Prefer comments for:
  - intent
  - invariants
  - non-obvious constraints
  - external protocol requirements
  - reasons behind a tradeoff
- Do not comment obvious code.
- Do not write comments that depend on a fragile folder name or temporary implementation detail.
- When possible, replace the need for a comment with:
  - a better function name
  - an extracted helper
  - a stronger type
  - a smaller component

## Ambiguity and Decision-Making

- Ask instead of inventing when a requirement is ambiguous.
- If two approved patterns both seem plausible, stop and ask which one should own the case.
- Do not silently make product, naming, ownership, or placement decisions that were not actually specified.

## Quality Gates

- Linting is required before claiming completion.
- Type safety is required before claiming completion.
- Build safety is required before claiming completion for app, route, config, or structural changes.
- Run relevant tests before claiming completion when logic changes or regression protection is expected.
- Add or update tests when the change introduces logic that should be protected from regression.

## Anti-Patterns

Do not introduce new code that depends on:

- `any`
- unsafe casts
- non-null assertion spam
- duplicated utility logic
- duplicated type definitions for the same concept
- giant components with mixed concerns
- hidden side effects in helpers
- magic strings for routes, statuses, and keys
- copy-pasted form and mutation logic
- stale shadow implementations kept “just in case”
- invented requirements disguised as implementation details

## Review Checklist

Before finishing, check:

- Did I reuse an existing pattern instead of inventing a new one?
- Did I avoid duplicate utilities and duplicate types?
- Did I ask instead of inventing when a key choice was ambiguous?
- Are the names still honest?
- Is the code smaller and clearer than before?
- Would this still make sense if a nearby file moved or was renamed?
- Can I explicitly say which checks I ran and which I did not?
