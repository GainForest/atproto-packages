// @gainforest/atproto-mutations-next
//
// Root export — types and primitives that are safe to import from anywhere
// (server components, client components, route handlers, scripts).
//
// For context-specific imports use the subpath exports:
//   @gainforest/atproto-mutations-next/actions  — raw server actions (server-to-server)
//   @gainforest/atproto-mutations-next/server   — layer construction, server utils
//   @gainforest/atproto-mutations-next/client   — adapted mutations namespace for useMutation

export type { MutationResult } from "@gainforest/atproto-mutations-core";
export { ok, err, MutationError, adapt } from "@gainforest/atproto-mutations-core";
