// @gainforest/atproto-auth-next/server
//
// Server-only exports — low-level utilities for advanced / custom setups.
// Never import this in client components.
//
// For most apps, use createAuthSetup() from the main entry point instead.

// ─── Session ──────────────────────────────────────────────────────────────────
export { getSession, saveSession, clearSession } from "./session/cookie";
export { restoreSession, getAuthenticatedAgent } from "./session/restore";
export type { SessionData, EmptySession, AnySession } from "./session/types";
export type { SessionConfig } from "./session/config";

// ─── Profile ──────────────────────────────────────────────────────────────────
export { fetchProfile } from "./profile";
export type { ProfileData, ProfileAuthError } from "./profile";

// ─── Route handler factories ──────────────────────────────────────────────────
export {
  createClientMetadataHandler,
  createJwksHandler,
} from "./handlers/metadata";
export type { ClientMetadataOptions } from "./handlers/metadata";

export {
  createAuthorizeHandler,
  createCallbackHandler,
  createLogoutHandler,
} from "./handlers/routes";
export type {
  AuthorizeHandlerOptions,
  CallbackHandlerOptions,
  LogoutHandlerOptions,
} from "./handlers/routes";

// ─── ePDS route handler factories ────────────────────────────────────────────
export {
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
} from "./handlers/epds";
export type { EpdsHandlerConfig } from "./handlers/epds";

// ─── Server actions factory ───────────────────────────────────────────────────
export { createAuthActions } from "./actions";
export type { AuthActionsConfig, AuthActions } from "./actions";

// ─── Setup factory ────────────────────────────────────────────────────────────
export { createAuthSetup, createOAuthSetup } from "./setup";
export type {
  AuthSetupConfig,
  AuthSetup,
  OAuthSetupConfig,
  OAuthSetup,
} from "./setup";
