/**
 * Server actions factory.
 *
 * createAuthActions() returns plain async functions that implement the standard
 * auth operations. Consumers wrap them in a "use server" file:
 *
 * ```typescript
 * // actions/auth.ts
 * "use server";
 * import { auth } from "@/lib/auth";
 * export const authorize = auth.actions.authorize;
 * export const logout = auth.actions.logout;
 * export const checkSession = auth.actions.checkSession;
 * export const getProfile = auth.actions.getProfile;
 * export const checkSessionAndGetProfile = auth.actions.checkSessionAndGetProfile;
 * ```
 *
 * These are intentionally NOT marked "use server" inside the package — that
 * directive only works in files in the consumer's project.
 */

import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { getSession, clearSession } from "../session/cookie";
import type { SessionConfig } from "../session/config";
import { restoreSession, getAuthenticatedAgent } from "../session/restore";
import { fetchProfile } from "../profile";
import type { ProfileData, ProfileAuthError } from "../profile";
import { DEFAULT_OAUTH_SCOPE } from "../oauth-client";
import { debug } from "../utils/debug";

export type { ProfileData, ProfileAuthError };

export type AuthActionsConfig = {
  oauthClient: NodeOAuthClient;
  sessionConfig: SessionConfig;
  /**
   * Default PDS domain to append when the handle has no dot.
   * e.g. "climateai.org" → "alice" becomes "alice.climateai.org"
   */
  defaultPdsDomain?: string;
  /** OAuth scope for authorize(). Defaults to "atproto transition:generic". */
  scope?: string;
};

export type AuthActions = {
  /**
   * Initiates the ATProto OAuth authorization flow for a given handle.
   *
   * The returned URL should be used to redirect the user to the ATProto
   * authorization server.
   *
   * @param handle - e.g. "alice" or "alice.climateai.org"
   * @returns { authorizationUrl: string }
   */
  authorize: (handle: string) => Promise<{ authorizationUrl: string }>;

  /**
   * Logs out the current user.
   *
   * Revokes the OAuth session (best-effort) and clears the session cookie.
   *
   * @returns { success: boolean }
   */
  logout: () => Promise<{ success: boolean }>;

  /**
   * Checks if the current session is valid.
   *
   * Reads the session cookie and verifies the stored OAuth tokens are still
   * valid in Supabase. Returns `{ authenticated: false }` and clears the
   * cookie if the session has been revoked or expired.
   */
  checkSession: () => Promise<
    | { authenticated: false }
    | { authenticated: true; did: string; handle?: string }
  >;

  /**
   * Fetches the user's profile (certified + bsky, in parallel).
   *
   * Returns `{ error: "unauthorized" }` if the session DID does not match the
   * requested DID (prevents one user from reading another's profile).
   *
   * @param did - The user's DID
   */
  getProfile: (
    did: string,
  ) => Promise<ProfileData | ProfileAuthError | null>;

  /**
   * Checks the current session and fetches the user's profile in one round-trip.
   *
   * Restores the OAuth session only once (avoids double-restoration when
   * calling checkSession() + getProfile() separately).
   */
  checkSessionAndGetProfile: () => Promise<{
    isLoggedIn: boolean;
    did?: string;
    handle?: string;
    profile?: ProfileData;
  }>;
};

/**
 * Creates the set of server actions for the auth flow.
 *
 * The returned functions are plain async functions — wrap them in a
 * "use server" file in the consuming app.
 */
export function createAuthActions(config: AuthActionsConfig): AuthActions {
  const { oauthClient, sessionConfig, defaultPdsDomain, scope = DEFAULT_OAUTH_SCOPE } = config;

  async function authorize(
    handle: string,
  ): Promise<{ authorizationUrl: string }> {
    const normalizedHandle =
      handle.includes(".") || !defaultPdsDomain
        ? handle
        : `${handle}.${defaultPdsDomain}`;

    debug.log("[actions/authorize] Starting OAuth flow", { handle: normalizedHandle });

    const authUrl = await oauthClient.authorize(normalizedHandle, { scope });
    return { authorizationUrl: authUrl.toString() };
  }

  async function logout(): Promise<{ success: boolean }> {
    const session = await getSession(sessionConfig);
    try {
      if (session.isLoggedIn) {
        await oauthClient.revoke(session.did);
        debug.log("[actions/logout] Session revoked", { did: session.did });
      }
    } catch (error) {
      // Revocation is best-effort — always clear the cookie
      debug.warn("[actions/logout] Failed to revoke session", error);
    } finally {
      await clearSession(sessionConfig);
    }
    return { success: true };
  }

  async function checkSession(): Promise<
    | { authenticated: false }
    | { authenticated: true; did: string; handle?: string }
  > {
    const session = await getSession(sessionConfig);

    if (!session.isLoggedIn) {
      return { authenticated: false };
    }

    // Verify the OAuth session is still valid in the store.
    // Catches cases where the session was deleted by another process
    // (e.g. logging in from a different device/tab).
    const oauthSession = await restoreSession(oauthClient, session.did);
    if (!oauthSession) {
      debug.warn("[actions/checkSession] Session gone — clearing cookie", {
        did: session.did,
      });
      await clearSession(sessionConfig);
      return { authenticated: false };
    }

    return {
      authenticated: true,
      did: session.did,
      handle: session.handle,
    };
  }

  async function getProfileAction(
    did: string,
  ): Promise<ProfileData | ProfileAuthError | null> {
    const appSession = await getSession(sessionConfig);

    if (!appSession.isLoggedIn || appSession.did !== did) {
      return { error: "unauthorized" };
    }

    const agent = await getAuthenticatedAgent(oauthClient, did);
    if (!agent) {
      debug.warn("[actions/getProfile] Could not restore session", { did });
      return null;
    }

    try {
      return await fetchProfile(agent, did, appSession.handle ?? did);
    } catch (error) {
      debug.error("[actions/getProfile] Profile fetch failed", error);
      return null;
    }
  }

  async function checkSessionAndGetProfile(): Promise<{
    isLoggedIn: boolean;
    did?: string;
    handle?: string;
    profile?: ProfileData;
  }> {
    const session = await getSession(sessionConfig);

    if (!session.isLoggedIn) {
      return { isLoggedIn: false };
    }

    // Restore the OAuth session once (shared with profile fetch below)
    const oauthSession = await restoreSession(oauthClient, session.did);
    if (!oauthSession) {
      debug.warn("[actions/checkSessionAndGetProfile] Session gone — clearing cookie", {
        did: session.did,
      });
      await clearSession(sessionConfig);
      return { isLoggedIn: false };
    }

    // Fetch profile with the same restored session
    let profile: ProfileData | undefined;
    try {
      const { Agent } = await import("@atproto/api");
      const agent = new Agent(oauthSession);
      const fetched = await fetchProfile(agent, session.did, session.handle ?? session.did);
      profile = fetched ?? undefined;
    } catch (error) {
      debug.warn("[actions/checkSessionAndGetProfile] Profile fetch failed", error);
      // Session is still valid — user stays logged in, just without profile data
      // (This can happen for ePDS sessions due to SDK nuances)
    }

    return {
      isLoggedIn: true,
      did: session.did,
      handle: session.handle,
      profile,
    };
  }

  return {
    authorize,
    logout,
    checkSession,
    getProfile: getProfileAction,
    checkSessionAndGetProfile,
  };
}
