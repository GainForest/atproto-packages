# @gainforest/atproto-mutations-next — Init Plan

## What this package is

The Next.js adapter layer for `@gainforest/atproto-mutations-core`. It does three things:
1. Provides the concrete `AtprotoAgent` layer implementation (reads OAuth session from Next.js cookies)
2. Exposes mutations as `"use server"` server actions (raw `MutationResult` returns — safe for server-to-server composition)
3. Ships the `mutations` client namespace (each action pre-wrapped with `adapt()` for `useMutation`)

Does NOT contain any mutation logic itself. All logic lives in `@gainforest/atproto-mutations-core`.

## What already exists (current state)

```
src/
├── index.ts              re-exports MutationResult, ok, err, MutationError, adapt from core
├── actions/
│   └── index.ts          "use server" — placeholder, no real actions yet
├── server/
│   └── index.ts          server utils — placeholder, no layer construction yet
└── client/
    └── index.ts          mutations namespace — currently {}, adapt + MutationError re-exported
```

**Export paths (all wired in package.json + tsup):**
| Path | Who uses it |
|---|---|
| `@gainforest/atproto-mutations-next` | Anyone — safe to import anywhere, just types + primitives |
| `@gainforest/atproto-mutations-next/actions` | Server-to-server calls, composing actions |
| `@gainforest/atproto-mutations-next/server` | Layer construction, server-only utilities |
| `@gainforest/atproto-mutations-next/client` | Client components — `mutations` namespace for `useMutation` |

## The core architecture decision (do not revisit)

**No tRPC.** We dropped it. Reasons:
- tRPC was solving (typed server→client RPC) what Next.js server actions now solve natively
- It would erase Effect's typed error channel at every procedure boundary
- Extra bundle weight and setup boilerplate for consumers

**The pattern instead:**
- Core logic = Effect services with typed errors
- Server actions = thin `Effect.runPromise()` wrappers that catch Effect errors → `MutationResult`
- Client namespace = `adapt()`-wrapped server actions that throw `MutationError` for React Query

## What needs to be built

### 1. `src/server/index.ts` — Agent layer construction

This is the key piece that bridges Next.js auth (`@gainforest/atproto-auth-next`) with the Effect services in core.

```ts
// src/server/index.ts
import { Layer } from "effect";
import { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import { getSession, getWriteAgent } from "@gainforest/atproto-auth-next/server";
import type { NodeOAuthClient } from "@gainforest/atproto-auth-next";
import type { SessionConfig } from "@gainforest/atproto-auth-next/server";

// User session layer — reads cookie, restores OAuth session
export function makeUserAgentLayer(
  client: NodeOAuthClient,
  sessionConfig: SessionConfig
): Layer.Layer<AtprotoAgent> {
  return Layer.effect(
    AtprotoAgent,
    Effect.gen(function*() {
      const session = yield* Effect.promise(() => getSession(sessionConfig));
      if (!session.isLoggedIn) {
        return yield* Effect.fail({ _tag: "Unauthorized" as const });
      }
      const result = yield* Effect.promise(() => getWriteAgent(client, session));
      if (!result.ok) {
        return yield* Effect.fail({ _tag: "SessionExpired" as const });
      }
      return { agent: result.agent };
    })
  );
}

// Service account layer — for server-initiated mutations (post-signup org setup, etc.)
// Uses a pre-constructed agent, not tied to a user session
export function makeServiceAgentLayer(agent: Agent): Layer.Layer<AtprotoAgent> {
  return Layer.succeed(AtprotoAgent, { agent });
}
```

### 2. `src/actions/index.ts` — Raw server actions

Every function here:
- Is marked `"use server"`
- Accepts plain serializable input
- Returns `Promise<MutationResult<TData, TCode>>` — never throws domain errors
- Calls `Effect.runPromise()` with the appropriate layer

Pattern for each action:
```ts
"use server";

import { Effect } from "effect";
import { AtprotoMutations } from "@gainforest/atproto-mutations-core";
import { ok, err } from "@gainforest/atproto-mutations-core";
import type { MutationResult } from "@gainforest/atproto-mutations-core";
import { makeUserAgentLayer } from "../server";
import { oauthClient, sessionConfig } from "../config"; // consuming app provides these
import type { CreateClaimInput, Claim } from "@gainforest/atproto-mutations-core";

export async function createClaimAction(
  input: CreateClaimInput
): Promise<MutationResult<Claim, "UNAUTHORIZED" | "SESSION_EXPIRED" | "INVALID_RECORD" | "PDS_ERROR">> {
  return Effect.runPromise(
    AtprotoMutations.createClaim(input).pipe(
      Effect.map((claim) => ok(claim)),
      Effect.catchAll((e) => Effect.succeed(mapEffectError(e))),
      Effect.provide(makeUserAgentLayer(oauthClient, sessionConfig))
    )
  );
}
```

**Server-to-server composition** (the key use case — e.g. post-signup):
```ts
// In the consuming app — NOT in this package
import { createUserAction, setupOrganizationAction } from "@gainforest/atproto-mutations-next/actions";

export async function onSignup(input: SignupInput) {
  const userResult = await createUserAction(input);
  if (!userResult.success) return userResult; // short-circuit, typed code

  const orgResult = await setupOrganizationAction({ did: userResult.data.did });
  if (!orgResult.success) return orgResult;

  return ok(userResult.data);
}
```

This works because raw actions return `MutationResult` — not throw — so chaining is clean and typed.

### 3. `src/client/index.ts` — mutations namespace

Once real actions exist in `./actions`, wire them here:

```ts
import { adapt } from "@gainforest/atproto-mutations-core";
import { createClaimAction, setupOrganizationAction } from "../actions";

export const mutations = {
  createClaim: adapt(createClaimAction),
  setupOrganization: adapt(setupOrganizationAction),
} as const;

export { adapt, MutationError } from "@gainforest/atproto-mutations-core";
```

Consumer usage:
```ts
import { mutations } from "@gainforest/atproto-mutations-next/client";
import { MutationError } from "@gainforest/atproto-mutations-next/client";

const { mutate } = useMutation({
  mutationFn: mutations.createClaim,
  onSuccess: (claim) => toast.success("Created"),  // claim is Claim, not Result<Claim>
  onError: (e) => {
    if (MutationError.is(e)) toast.error(e.code);  // e.code is typed
  },
});
```

### 4. Configuration injection

The package needs `oauthClient` (NodeOAuthClient) and `sessionConfig` to construct agent layers. Two options — **pick one and be consistent**:

**Option A — Parameter injection** (recommended): `makeUserAgentLayer(client, sessionConfig)` — the consuming app passes its instances at call site. No hidden env reads inside the package. More testable. This is what `@gainforest/atproto-auth-next` does with `SessionConfig`.

**Option B — Re-export a setup function**: `configureAtprotoMutations({ client, sessionConfig })` called once in `lib/mutations.ts` in the consuming app, stores in module scope. More ergonomic but less pure.

Option A is already partially implied by the server layer sketches above.

## Error mapping convention

Effect errors → `MutationResult` error codes happens at the server action boundary. Define a mapper per domain:

```ts
// src/actions/error-map.ts
import type { PDSError } from "@gainforest/atproto-mutations-core";
import { err } from "@gainforest/atproto-mutations-core";

export function mapEffectError(e: PDSError | { _tag: "Unauthorized" } | { _tag: "SessionExpired" }) {
  switch (e._tag) {
    case "Unauthorized":    return err("UNAUTHORIZED", "Not logged in");
    case "SessionExpired":  return err("SESSION_EXPIRED", "Session expired, please log in again");
    case "RecordNotFound":  return err("PDS_ERROR", `Record not found: ${e.nsid}`);
    case "InvalidRecord":   return err("INVALID_RECORD", e.message);
    default:                return err("PDS_ERROR", "An unexpected error occurred");
  }
}
```

## Dependency budget

```json
{
  "dependencies": {
    "@gainforest/atproto-mutations-core": "workspace:*",
    "@gainforest/atproto-auth-next": "workspace:*",
    "@gainforest/internal-utils": "workspace:*",
    "effect": "^x.x.x"
  },
  "peerDependencies": {
    "next": ">=14.0.0",
    "typescript": "^5.0.0"
  }
}
```

`effect` may already be in `atproto-mutations-core` deps — if so, it can be a peer here.

## Critical rules

1. **`"use server"` only in `src/actions/index.ts`** — not in `src/server/`, not in `src/client/`
2. **Never import from `src/client/` on the server** — the `mutations` namespace calls server actions over the network when invoked from client context; on the server you call actions directly
3. **Server actions always return `MutationResult`, never throw** — this is what makes server-to-server composition safe and typed
4. **`adapt()` is only for client-facing code** — never wrap an action with `adapt()` and then call it server-side; use the raw action
5. **No mutation logic in this package** — if you find yourself writing PDS call logic here, it belongs in `@gainforest/atproto-mutations-core`

## Checklist for adding a new mutation

1. In `@gainforest/atproto-mutations-core`:
   - Add Zod input schema to `src/schemas/<domain>.ts`
   - Add output type to `src/types/<domain>.ts`
   - Implement in `AtprotoMutations` Effect service
2. In `src/actions/index.ts` (this package):
   - Add `"use server"` async function returning `MutationResult`
   - Map Effect errors with `mapEffectError`
3. In `src/client/index.ts`:
   - Add to `mutations` namespace via `adapt(theNewAction)`
