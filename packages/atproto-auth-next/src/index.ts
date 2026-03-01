// @gainforest/atproto-auth-next
//
// Main entry point — the createAuthSetup factory and its types.
// Import this in your lib/auth.ts configuration file.
//
// Context-specific imports:
//   @gainforest/atproto-auth-next/server   — low-level server utilities (advanced)
//   @gainforest/atproto-auth-next/stores   — Supabase store factories (advanced)
//   @gainforest/atproto-auth-next/client   — session data types (client-safe)

export { createAuthSetup } from "./setup";
export type { AuthSetupConfig, AuthSetup } from "./setup";

export type { SessionData, EmptySession, AnySession } from "./session/types";
export type { ProfileData, ProfileAuthError } from "./profile";
export type { AuthActions } from "./actions";

// Also export createOAuthClient for advanced / custom setups
export { createOAuthClient, DEFAULT_OAUTH_SCOPE } from "./oauth-client";
export type { OAuthClientConfig } from "./oauth-client";
export { NodeOAuthClient } from "./oauth-client";

// URL utilities (useful for custom config logic)
export { resolvePublicUrl, isLoopback } from "./utils/url";
