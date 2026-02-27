/**
 * The return type of every raw server action in @gainforest/atproto-mutations-next.
 *
 * - Raw server actions (./actions) return this — safe to use server-to-server.
 * - The client namespace (./client) wraps this via adapt(), converting the
 *   error branch into a thrown MutationError so React Query's onError fires.
 */
export type MutationResult<TData, TCode extends string> =
  | { success: true; data: TData }
  | { success: false; code: TCode; message: string };

// ---------------------------------------------------------------------------
// Constructors — use these inside action implementations, never build the
// object literal directly. Keeps the shape consistent and refactor-safe.
// ---------------------------------------------------------------------------

export const ok = <TData>(data: TData): MutationResult<TData, never> => ({
  success: true,
  data,
});

export const err = <TCode extends string>(
  code: TCode,
  message: string
): MutationResult<never, TCode> => ({
  success: false,
  code,
  message,
});
