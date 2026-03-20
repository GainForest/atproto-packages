import { S as SessionConfig } from './setup-ziFPvUKo.js';
export { A as AuthActions, d as AuthActionsConfig, a as AuthSetup, b as AuthSetupConfig, O as OAuthSetup, e as OAuthSetupConfig, f as createAuthActions, c as createAuthSetup, g as createOAuthSetup } from './setup-ziFPvUKo.js';
import { A as AnySession, S as SessionData } from './client-BzoqfpZM.js';
export { E as EmptySession, P as ProfileAuthError, a as ProfileData, f as fetchProfile } from './client-BzoqfpZM.js';
import { Agent } from '@atproto/api';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { NextRequest, NextResponse } from 'next/server';
import '@supabase/supabase-js';

declare function getSession(config: SessionConfig): Promise<AnySession>;
declare function saveSession(data: SessionData, config: SessionConfig): Promise<void>;
declare function clearSession(config: SessionConfig): Promise<void>;

/**
 * Session restoration utilities.
 *
 * These functions restore a stored OAuth session from Supabase and optionally
 * return an authenticated @atproto/api Agent for making API calls.
 */

/**
 * Restores a stored OAuth session for the given DID.
 *
 * Returns the restored session object (which can be passed to `new Agent(session)`)
 * or `null` if the session does not exist or has been revoked.
 *
 * @example
 * ```typescript
 * const oauthSession = await restoreSession(oauthClient, did);
 * if (!oauthSession) {
 *   // Session gone — user needs to re-authenticate
 * }
 * ```
 */
declare function restoreSession(client: NodeOAuthClient, did: string): Promise<Awaited<ReturnType<NodeOAuthClient["restore"]>> | null>;
/**
 * Restores an OAuth session and returns an authenticated Agent ready for API calls.
 *
 * Returns `null` if the session does not exist or restoration fails.
 *
 * @example
 * ```typescript
 * const agent = await getAuthenticatedAgent(oauthClient, did);
 * if (agent) {
 *   const profile = await agent.getProfile({ actor: did });
 * }
 * ```
 */
declare function getAuthenticatedAgent(client: NodeOAuthClient, did: string): Promise<Agent | null>;

type ClientMetadataOptions = {
    clientName: string;
    /** Extra redirect URIs to include (e.g. ePDS callback). */
    extraRedirectUris?: string[];
    scope?: string;
    /** Logo URI for OAuth consent screens. */
    logoUri?: string;
    /** Brand color (hex) for OAuth consent screens. */
    brandColor?: string;
    /** Background color (hex) for OAuth consent screens. */
    backgroundColor?: string;
    /** Email template URI for OTP emails (ePDS). */
    emailTemplateUri?: string;
    /** Email subject template for OTP emails (ePDS). */
    emailSubjectTemplate?: string;
    /** Terms of service URI. */
    tosUri?: string;
    /** Privacy policy URI. */
    policyUri?: string;
};
/**
 * Creates a GET handler that serves the OAuth client metadata JSON.
 *
 * The client_id for web clients points to this endpoint. It must be publicly
 * accessible (i.e. not behind auth).
 *
 * For loopback (127.0.0.1/localhost) clients, returns RFC 8252 compliant
 * native app metadata with embedded redirect URIs in the client_id.
 */
declare function createClientMetadataHandler(publicUrl: string, options: ClientMetadataOptions): (req: NextRequest) => NextResponse<{
    token_endpoint_auth_method: string;
    application_type: string;
    client_id: string;
}>;
/**
 * Creates a GET handler that serves the public JWKS (JSON Web Key Set).
 *
 * Derives the public key from the private JWK (strips the `d` parameter).
 * Must be publicly accessible.
 */
declare function createJwksHandler(privateKeyJwk: string): () => NextResponse<{
    keys: {
        [x: string]: unknown;
    }[];
}>;

type AuthorizeHandlerOptions = {
    /**
     * Default PDS domain to append when the handle has no dot.
     * e.g. "climateai.org" → "alice" becomes "alice.climateai.org"
     */
    defaultPdsDomain?: string;
    /** OAuth scope. Defaults to "atproto transition:generic". */
    scope?: string;
};
/**
 * Creates a POST handler that initiates the standard ATProto OAuth flow.
 *
 * Expects JSON body: { handle: string }
 * Returns JSON: { url: string }
 *
 * Mount at: /api/oauth/authorize
 */
declare function createAuthorizeHandler(client: NodeOAuthClient, options?: AuthorizeHandlerOptions): (req: NextRequest) => Promise<NextResponse<{
    url: string;
}>>;
type CallbackHandlerOptions = {
    /** Path to redirect to after successful login. Defaults to "/". */
    redirectTo?: string;
};
/**
 * Creates a GET handler that processes the standard ATProto OAuth callback.
 *
 * Exchanges the auth code for tokens, resolves the handle, saves the
 * session cookie, and redirects to the success path.
 *
 * Mount at: /api/oauth/callback
 */
declare function createCallbackHandler(client: NodeOAuthClient, sessionConfig: SessionConfig, options?: CallbackHandlerOptions): (req: NextRequest) => Promise<never>;
type LogoutHandlerOptions = {
    /** Path to redirect to after logout. If not set, returns JSON { ok: true }. */
    redirectTo?: string;
};
/**
 * Creates a POST handler that logs out the current user.
 *
 * Revokes the OAuth session (best-effort) and clears the session cookie.
 *
 * Mount at: /api/oauth/logout
 */
declare function createLogoutHandler(client: NodeOAuthClient, sessionConfig: SessionConfig, options?: LogoutHandlerOptions): () => Promise<NextResponse<unknown>>;

/**
 * ePDS OAuth route handlers.
 *
 * Two handlers are provided:
 *
 * 1. createEpdsLoginHandler — initiates the ePDS OAuth flow
 *    Mount at: /api/oauth/epds/login
 *    Called with: GET /api/oauth/epds/login?email=user@example.com
 *
 * 2. createEpdsCallbackHandler — handles the ePDS callback
 *    Mount at: /api/oauth/epds/callback
 *    Called by the ePDS server with: GET /api/oauth/epds/callback?code=...&state=...
 *
 * Both handlers delegate all OAuth complexity (PKCE, DPoP, PAR, token exchange,
 * session construction) to the @atproto/oauth-client-node SDK via:
 *   - client.authorize(epdsUrl)  — login
 *   - client.callback(params)    — callback
 *
 * The SDK stores state and sessions in the shared stateStore / sessionStore,
 * so no separate ePDS-specific stores are needed.
 */

type EpdsLoginHandlerConfig = {
    /** The shared NodeOAuthClient (same instance used for handle login). */
    oauthClient: NodeOAuthClient;
    /** ePDS base URL (e.g. https://climateai.org). Passed to client.authorize(). */
    epdsUrl: string;
    /** OAuth scope. */
    scope: string;
    /** Path to redirect to on error. Defaults to "/?error=auth_failed". */
    errorRedirectTo?: string;
};
type EpdsCallbackHandlerConfig = {
    /** The shared NodeOAuthClient (same instance used for handle login). */
    oauthClient: NodeOAuthClient;
    /** iron-session config for saving the app cookie. */
    sessionConfig: SessionConfig;
    /** Path to redirect to after successful login. Defaults to "/". */
    successRedirectTo?: string;
    /** Path to redirect to on error. Defaults to "/?error=auth_failed". */
    errorRedirectTo?: string;
};
/**
 * Creates a GET handler that initiates the ePDS email-based OAuth flow.
 *
 * Delegates entirely to client.authorize(epdsUrl) — the SDK handles
 * well-known discovery, PKCE, DPoP key generation, and the PAR request.
 * State is stored in the shared stateStore (same as handle login).
 */
declare function createEpdsLoginHandler(config: EpdsLoginHandlerConfig): (req: NextRequest) => Promise<NextResponse>;
/**
 * Creates a GET handler that processes the ePDS OAuth callback.
 *
 * Delegates entirely to client.callback(params) — the SDK matches the state
 * param to the stored context from client.authorize(), exchanges the code for
 * tokens (with DPoP proofs), and writes the NodeSavedSession to the shared
 * sessionStore. No manual token exchange or session construction needed.
 */
declare function createEpdsCallbackHandler(config: EpdsCallbackHandlerConfig): (req: NextRequest) => Promise<NextResponse>;

export { AnySession, type AuthorizeHandlerOptions, type CallbackHandlerOptions, type ClientMetadataOptions, type EpdsCallbackHandlerConfig, type EpdsLoginHandlerConfig, type LogoutHandlerOptions, SessionConfig, SessionData, clearSession, createAuthorizeHandler, createCallbackHandler, createClientMetadataHandler, createEpdsCallbackHandler, createEpdsLoginHandler, createJwksHandler, createLogoutHandler, getAuthenticatedAgent, getSession, restoreSession, saveSession };
