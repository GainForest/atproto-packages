# @gainforest/atproto-mutations-core — Init Plan

## What this package is

Framework-agnostic primitives for ATProto mutations. Zero framework dependencies (no Next.js, no React). The foundation that `@gainforest/atproto-mutations-next` builds on top of, but also independently usable in plain Node/Bun scripts, workers, or any non-Next.js backend.

## What already exists (current state)

```
src/
├── result.ts    MutationResult<TData, TCode> type + ok() / err() constructors
├── error.ts     MutationError class — typed code, MutationError.is(), .isCode()
├── adapt.ts     adapt() — wraps MutationResult-returning fn → throws MutationError on failure
└── index.ts     re-exports all of the above
```

**`MutationResult<TData, TCode extends string>`**
```ts
type MutationResult<TData, TCode extends string> =
  | { success: true; data: TData }
  | { success: false; code: TCode; message: string };
```
Every raw server action returns this. Never throws domain errors.

**`ok(data)` / `err(code, message)`**
Constructors. Always use these inside action implementations — never build the object literal directly.

**`MutationError<TCode>`**
Thrown by `adapt()`. Carries typed `code` string. Has static guards:
- `MutationError.is(value)` — narrows unknown to MutationError
- `MutationError.isCode(value, "SOME_CODE")` — narrows to specific code

**`adapt(action)`**
Takes a `(input: TInput) => Promise<MutationResult<TData, TCode>>` and returns a `(input: TInput) => Promise<TData>` that throws `MutationError` on failure. This is what makes raw server actions suitable as `mutationFn` in React Query.

## What needs to be built

### 1. Effect services (the main workload)

The backend mutation logic lives here as Effect services. This is the meat of the package.

**Decided architecture**: Effect services, not plain async functions. Reasons:
- Typed errors surfaced through Effect's error channel (`Effect<A, E, R>`)
- Composable — callers can sequence multiple mutations in a single `Effect.gen` pipeline
- Fully testable by providing mock layers
- No framework coupling

**Pattern to follow**:
```ts
// src/services/AtprotoMutations.ts
import { Effect, Context, Layer } from "effect";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";

// Service interface — what the service provides
export class AtprotoMutations extends Effect.Service<AtprotoMutations>()(
  "AtprotoMutations",
  {
    effect: Effect.gen(function*() {
      const agent = yield* AtprotoAgent;
      return {
        createClaim: (input: CreateClaimInput) =>
          Effect.gen(function*() {
            // actual PDS call
            // typed errors in error channel — NOT thrown
          }),
      };
    }),
  }
) {}
```

**Typed errors** — define them as tagged unions per domain:
```ts
// src/errors.ts
export type PDSError =
  | { _tag: "RecordNotFound"; nsid: string }
  | { _tag: "Unauthorized" }
  | { _tag: "InvalidRecord"; message: string };
```

**Zod input schemas** — every mutation input is a Zod schema. The schema is the single source of truth for validation. Types are inferred from schemas (`z.infer<typeof CreateClaimSchema>`).

### 2. AtprotoAgent service

A dependency that provides an authenticated `Agent`. The service is abstract here — concrete implementations live in `atproto-mutations-next` (reads from Next.js cookies) and can be mocked in tests.

```ts
// src/services/AtprotoAgent.ts
import { Context } from "effect";
import type { Agent } from "@atproto/api";

export class AtprotoAgent extends Context.Tag("AtprotoAgent")<
  AtprotoAgent,
  { agent: Agent }
>() {}
```

### 3. Input/output types

All shared types live here so `atproto-mutations-next` can import them for action signatures without duplicating.

```
src/
├── schemas/          Zod schemas — one file per lexicon domain
│   ├── claim.ts
│   ├── organization.ts
│   └── ...
└── types/            Inferred types from schemas + output shapes
    ├── claim.ts
    ├── organization.ts
    └── ...
```

### 4. Lexicon types

`@atproto/lex` generates TypeScript types from the lexicons in `GENERATED/types/`. Mutations use these as the shapes passed to `agent.com.atproto.repo.createRecord` / `.putRecord` / `.deleteRecord`.

Import pattern from any package in the monorepo:
```ts
import type { Record as ClaimActivity } from "../../../GENERATED/types/org/hypercerts/claim/activity";
```

There is no re-exporting of generated types from this package — consumers reference `GENERATED/types/` directly. This keeps the generated layer orthogonal to the SDK layer.

## What NOT to put here

- Nothing that imports `next/headers`, `next/cache`, or `next/navigation`
- No `"use server"` directives
- No React imports
- No HTTP framework code
- No tRPC — we deliberately dropped tRPC

## Dependency budget

Should stay lean. Expected deps when fully implemented:
```json
{
  "dependencies": {
    "@atproto/api": "^0.x.x",
    "@gainforest/internal-utils": "workspace:*",
    "effect": "^x.x.x",
    "zod": "^x.x.x"
  }
}
```

`@atproto/oauth-client-node` does NOT belong here — that's Next.js layer territory. Agent construction from an OAuth session happens in `atproto-mutations-next/server`.

## Export surface

Single export path `@gainforest/atproto-mutations-core`. No subpath exports needed — this is a focused package.

Exports when complete:
- `MutationResult`, `ok`, `err` — result primitives
- `MutationError`, `adapt` — client-side adaptation
- `AtprotoMutations` — the main Effect service
- `AtprotoAgent` — the agent Context.Tag (so next package can provide it)
- All input schemas and inferred types
- All error types

## Checklist for adding a new mutation

1. Add Zod schema to `src/schemas/<domain>.ts`
2. Add output type to `src/types/<domain>.ts`
3. Implement in `AtprotoMutations` service — errors in the Effect error channel, not thrown
4. Export schema, types, and the service method
5. In `atproto-mutations-next/actions/index.ts` — add the raw server action wrapper
6. In `atproto-mutations-next/src/client/index.ts` — add to the `mutations` namespace via `adapt()`
