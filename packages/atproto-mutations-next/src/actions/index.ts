"use server";

// @gainforest/atproto-mutations-next/actions
//
// Raw server actions — every function here returns MutationResult<TData, TCode>
// and never throws domain errors.
//
// USE THIS when:
//   - Calling one server action from another (server-to-server composition)
//   - You need access to the full Result shape (e.g. mapping errors upward)
//
// DO NOT use this in client components directly — import from ./client instead,
// which ships the adapt()-wrapped mutations namespace.
//
// Example — server-to-server (e.g. post-signup org setup):
//
//   import { createUser, setupOrganization } from "@gainforest/atproto-mutations-next/actions";
//
//   export async function signup(input: SignupInput) {
//     const userResult = await createUser(input);
//     if (!userResult.success) return userResult;
//
//     const orgResult = await setupOrganization({ did: userResult.data.did });
//     if (!orgResult.success) return orgResult;
//
//     return ok(userResult.data);
//   }

// Placeholder — real mutations are added here as the SDK grows.
export {};
