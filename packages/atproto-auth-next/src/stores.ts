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

// Note: The ePDS state store has been removed. State for the ePDS flow is now
// managed internally by the @atproto/oauth-client-node SDK via the shared
// stateStore (createSupabaseStateStore above).
