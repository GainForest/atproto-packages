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

## Review Checklist

Before finishing, check:

- Did I use an effect only for real external synchronization?
- Did I avoid all `setState` calls from effects and side effects?
- Can any stored state be derived instead?
- Is the component smaller and easier to reason about?
- Did I choose the right owner for the state: local, URL, query cache, or server?
