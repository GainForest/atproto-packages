// @gainforest/atproto-auth-next/stores
//
// Supabase-backed store factories for the OAuth client.
// Import these when constructing the OAuth client manually (advanced use).
// Requires @supabase/supabase-js to be installed in the consuming app.

export { createSupabaseSessionStore } from "./stores/session-store";
export {
  createSupabaseStateStore,
  cleanupExpiredStates,
} from "./stores/state-store";

// ePDS ephemeral state store
export { createEpdsStateStore } from "./epds/state-store";
export type { EpdsOAuthState } from "./epds/state-store";
