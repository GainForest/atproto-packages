// @gainforest/atproto-mutations-next/client
//
// Client-facing mutations namespace.
//
// Every function here is the adapt()-wrapped version of its corresponding
// raw server action. This means:
//   - It returns TData directly on success (not wrapped in MutationResult).
//   - It throws MutationError on failure, so React Query's onError fires
//     with a typed, structured error — not a generic Error.
//
// USE THIS in client components with useMutation:
//
//   import { mutations } from "@gainforest/atproto-mutations-next/client";
//   import { MutationError } from "@gainforest/atproto-mutations-core";
//
//   const { mutate } = useMutation({
//     mutationFn: mutations.createClaim,
//     onSuccess: (claim) => toast.success("Claim created"),
//     onError: (e) => {
//       if (MutationError.is(e)) toast.error(e.code);
//     },
//   });
//
// DO NOT use this on the server — import from ./actions or ./server instead.

import { adapt } from "@gainforest/atproto-mutations-core";

// The mutations namespace is built by adapt()-wrapping every raw server action.
// As real actions are added to ./actions, wire them up here.
//
// Example (once createClaimAction exists):
//   import { createClaimAction } from "../actions";
//   export const mutations = {
//     createClaim: adapt(createClaimAction),
//   } as const;

export const mutations = {} as const;

// Re-export adapt and MutationError so consumers don't need a separate import
// from core just to handle errors or wrap their own actions.
export { adapt } from "@gainforest/atproto-mutations-core";
export { MutationError } from "@gainforest/atproto-mutations-core";
