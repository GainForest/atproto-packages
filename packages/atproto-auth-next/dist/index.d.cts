export { A as AuthActions, a as AuthSetup, b as AuthSetupConfig, c as createAuthSetup } from './setup-B9ryJI_1.cjs';
export { A as AnySession, E as EmptySession, P as ProfileAuthError, a as ProfileData, S as SessionData } from './client-BzoqfpZM.cjs';
import { NodeOAuthClientOptions, NodeOAuthClient } from '@atproto/oauth-client-node';
export { NodeOAuthClient } from '@atproto/oauth-client-node';
import '@supabase/supabase-js';
import 'next/server';
import '@atproto/api';

declare const DEFAULT_OAUTH_SCOPE = "atproto transition:generic";
type OAuthClientConfig = {
    publicUrl: string;
    privateKeyJwk: string;
    stateStore: NodeOAuthClientOptions["stateStore"];
    sessionStore: NodeOAuthClientOptions["sessionStore"];
    /** OAuth scope string. Defaults to "atproto transition:generic". */
    scope?: string;
    /** Extra redirect URIs to include (e.g. ePDS callback). */
    extraRedirectUris?: string[];
    /** App name shown in OAuth consent screen. Defaults to "Gainforest". */
    clientName?: string;
};
/**
 * Creates a NodeOAuthClient configured for either loopback (local dev) or
 * production (web) based on the resolved public URL.
 *
 * Loopback (127.0.0.1 / localhost):
 *   - Uses RFC 8252 native app client_id: http://localhost?scope=...&redirect_uri=...
 *   - No client authentication (token_endpoint_auth_method: "none")
 *   - application_type: "native"
 *
 * Production:
 *   - Uses web client_id: {publicUrl}/client-metadata.json
 *   - Private key JWT authentication
 *   - application_type: "web"
 */
declare function createOAuthClient({ publicUrl, privateKeyJwk, stateStore, sessionStore, scope, extraRedirectUris, clientName, }: OAuthClientConfig): NodeOAuthClient;

/**
 * Public URL resolution utilities.
 *
 * Resolves the app's public URL from environment variables, with Vercel
 * auto-detection and loopback detection for local development.
 *
 * Priority order:
 *   1. NEXT_PUBLIC_BASE_URL — explicit override (ngrok, custom domain, etc.)
 *   2. VERCEL_BRANCH_URL   — stable per-branch URL for preview deploys
 *   3. VERCEL_URL          — fallback Vercel auto-detected URL
 *   4. http://127.0.0.1:PORT — local development fallback
 *   5. https://placeholder.invalid — build-time fallback (never used at runtime)
 *
 * Note: Loopback detection is URL-based, not NODE_ENV-based. This correctly
 * handles ngrok/tunnel URLs in development where NODE_ENV is 'development'
 * but the URL is publicly accessible.
 */
/**
 * Resolve the public URL from env vars or an explicit override.
 *
 * @param explicitUrl - Pass this to skip env var lookup entirely (e.g. from config).
 */
declare function resolvePublicUrl(explicitUrl?: string): string;
/**
 * Returns true if the given URL is a loopback address (127.0.0.1 or localhost).
 *
 * Used to select between the loopback OAuth client (RFC 8252 native app)
 * and the production web OAuth client.
 */
declare function isLoopback(url: string): boolean;

export { DEFAULT_OAUTH_SCOPE, type OAuthClientConfig, createOAuthClient, isLoopback, resolvePublicUrl };
