// @gainforest/atproto-mutations-next/server
//
// Server-side utilities for @gainforest/atproto-mutations-next.
//
// What lives here:
//   - makeAtprotoLayer()  — builds the Effect layer for a given request context.
//     On user-initiated requests it reads the session from next/headers (cookies).
//     On internal server calls (e.g. post-signup setup) it accepts explicit
//     credentials or uses a service account.
//   - Any other server-only helpers (e.g. revalidation helpers, cache tags).
//
// This file does NOT use "use server" — it is not a server actions file.
// It is imported by server actions and route handlers directly.
//
// Example — route handler using core Effect + this layer:
//
//   import { Effect } from "effect";
//   import { AtprotoMutations } from "@gainforest/atproto-mutations-core";
//   import { makeAtprotoLayer } from "@gainforest/atproto-mutations-next/server";
//
//   export async function POST(req: Request) {
//     const input = await req.json();
//     const result = await Effect.runPromise(
//       AtprotoMutations.createClaim(input).pipe(
//         Effect.provide(makeAtprotoLayer({ serviceAccount: true }))
//       )
//     );
//     return Response.json(result);
//   }

// Placeholder — layer construction is added here alongside real mutations.
export {};
