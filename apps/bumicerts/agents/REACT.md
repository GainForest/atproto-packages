# React Rules

Use this doc for components, hooks, local state, effects, and client behavior.

## Core State Rules

- Keep state as local as possible.
- Do not store what can be derived during render.
- Do not duplicate server data into local state without a strong reason.
- Prefer event-driven updates over effect-driven updates.
- Use URL state when the state belongs in the URL.
- Use query cache for server data.
- Use local state for transient local UI behavior only.

## Effects

Use effects only to synchronize with an external system.

Examples of valid effect work:

- subscribing to browser APIs
- attaching event listeners
- integrating third-party widgets
- synchronizing with timers or network side channels

Examples of invalid effect work:

- deriving display state from props or query results
- copying data into state because it is convenient
- resetting state after render when the state could be derived instead
- triggering a `setState` chain that should happen in an event handler
- using an effect as a substitute for a clearer data model

## Hard Rule

- Never call `setState` callbacks inside `useEffect` or other side effects.

If you think you need one, stop and look for a better pattern first.

## Why This Rule Is Intentional

This rule is intentionally strict.

React guidance in “You Might Not Need an Effect” aligns with it: many effect-time state updates are really one of these problems in disguise:

- redundant derived state
- event-specific logic delayed until after render
- prop-driven reset logic that should use a key or render-time derivation
- synchronization between two local state copies that should not both exist
- chains of updates that should be collapsed into one event-time transition
- external subscriptions that should use a purpose-built hook or a more direct synchronization pattern

Effect-time local state updates often cause:

- stale-first render, then corrective re-render
- unnecessary extra render passes
- synchronization bugs between state copies
- fragile logic that becomes harder to evolve safely
- code that looks reactive but is actually patching an avoidable modeling problem

Do not treat “it works” as enough reason to keep or add this pattern.

## Before Reaching for an Effect

If you think an effect needs to set local state, stop and check these alternatives in order:

1. Can this value be derived during render from props, state, or query data?
2. Can this update happen directly in the event handler that caused it?
3. Should this state be represented by a `key` boundary instead of a reset effect?
4. Can the data model be simplified so there is only one source of truth?
5. Is this really an external-store subscription better served by a dedicated hook or `useSyncExternalStore`?
6. Is this a fetch or async synchronization case where the effect should synchronize external data, not mirror local derived state?

If one of those solves it, do that instead of adding effect-owned local state updates.

## Preferred Re-thinks for Common Cases

- Derived display value → compute during render
- Expensive pure derivation → `useMemo` only if the cost is real
- User interaction flow → update in the event handler
- Reset whole subtree on identity change → use a `key`
- Reset partial local state on identity change → first try eliminating the duplicated state; if impossible, stop and ask before using an effect workaround
- Notify parent after local interaction → update both during the same event path or lift state up
- Synchronize with browser or third-party subscription → prefer a dedicated subscription pattern; avoid turning the effect into a local-state patch loop
- Fetching → synchronize the remote result carefully, with cleanup for stale responses where applicable; do not add extra derived-state effects around fetched data

## How to Treat “Valid Effect Work”

“Valid effect work” means synchronizing with something external.

That does not grant permission to add local `setState` calls casually.

If an effect seems to need a local state setter, first prove that the setter is part of unavoidable external synchronization rather than:

- render-time derivation
- event-time logic
- duplicated state
- corrective reset-after-render logic

If you cannot make that case confidently, do not add the pattern.

## If You Think No Alternative Exists

If you believe a local state update inside an effect is unavoidable:

- do not add it immediately
- explain why render-time derivation, event-time updates, key-based reset, lifted state, and external-store patterns do not solve it
- ask the user for a reviewed choice before proceeding
- call out the location as a non-abiding exception unless the docs are explicitly updated to allow that case

The burden of proof is on the exception, not on the rule.

## Preferred Alternatives

- If a value can be computed from props, state, or query data, derive it during render.
- If a change happens because the user clicked or typed, update it in the event handler.
- If state should survive refresh, share, or navigation, use `nuqs`.
- If state comes from the server, keep it in server components or query cache.
- If a value is expensive but pure, compute it with memoization only after confirming the cost matters.
- If you need mutable instance data without re-rendering, use a ref.

## Component Structure

- Prefer small focused components.
- Avoid giant “everything components”.
- Replace boolean prop soup with variants or unions.
- Keep component APIs narrow and intentional.
- Do not define large inline components inside render bodies.
- Co-locate component-specific helpers when they are not shared.
- Extract repeated JSX only when it improves clarity.

## Hooks

- Hooks should encapsulate behavior, not hide surprising side effects.
- Keep hook return types stable and intentional.
- Prefer explicit names over magical “manager” hooks.
- A hook should not become a dumping ground for unrelated state.

## Forms and Interaction State

- Keep field state and mutation state clear.
- Do not synchronize multiple copies of the same form data without reason.
- Prefer schema-driven validation.
- Keep optimistic UI local to the interaction that owns it.

## Performance

- Do not reach for `useMemo` and `useCallback` by default.
- Memoize only when it solves a measured or obvious problem.
- Avoid avoidable re-renders by passing smaller props and splitting components where useful.
- Prefer cleaner state design over defensive memoization.
- Avoid defining components inside other components.

## Supporting Skill

After reading this file, if the task materially benefits from additional React implementation or performance guidance, load the root skill at:

- `../.agents/skills/vercel-react-best-practices/SKILL.md`

Use the skill name:

- `vercel-react-best-practices`

Apply it for React component work, hook design, state ownership, render performance, and refactors where it directly improves the result.

Local Bumicerts React rules still outrank the skill.

## Review Checklist

Before finishing, check:

- Did I use an effect only for real external synchronization?
- Did I avoid all `setState` calls from effects and side effects?
- Can any stored state be derived instead?
- Is the component smaller and easier to reason about?
- Did I choose the right owner for the state: local, URL, query cache, or server?
