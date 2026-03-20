import { SupabaseClient } from '@supabase/supabase-js';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { NextRequest } from 'next/server';
import { a as ProfileData, P as ProfileAuthError, A as AnySession } from './client-BzoqfpZM.js';
import { Agent } from '@atproto/api';

type SessionConfig = {
    cookieSecret: string;
    cookieName?: string;
    secure?: boolean;
};

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

type AuthActionsConfig = {
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
type AuthActions = {
    /**
     * Initiates the ATProto OAuth authorization flow for a given handle.
     *
     * The returned URL should be used to redirect the user to the ATProto
     * authorization server.
     *
     * @param handle - e.g. "alice" or "alice.climateai.org"
     * @returns { authorizationUrl: string }
     */
    authorize: (handle: string) => Promise<{
        authorizationUrl: string;
    }>;
    /**
     * Logs out the current user.
     *
     * Revokes the OAuth session (best-effort) and clears the session cookie.
     *
     * @returns { success: boolean }
     */
    logout: () => Promise<{
        success: boolean;
    }>;
    /**
     * Checks if the current session is valid.
     *
     * Reads the session cookie and verifies the stored OAuth tokens are still
     * valid in Supabase. Returns `{ authenticated: false }` and clears the
     * cookie if the session has been revoked or expired.
     */
    checkSession: () => Promise<{
        authenticated: false;
    } | {
        authenticated: true;
        did: string;
        handle?: string;
    }>;
    /**
     * Fetches the user's profile (certified + bsky, in parallel).
     *
     * Returns `{ error: "unauthorized" }` if the session DID does not match the
     * requested DID (prevents one user from reading another's profile).
     *
     * @param did - The user's DID
     */
    getProfile: (did: string) => Promise<ProfileData | ProfileAuthError | null>;
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
declare function createAuthActions(config: AuthActionsConfig): AuthActions;

/**
 * createAuthSetup — the main entry point for @gainforest/atproto-auth-next.
 *
 * Creates a fully-configured auth setup object containing:
 * - Route handlers (authorize, callback, logout, client-metadata, jwks, ePDS)
 * - Server actions (authorize, logout, checkSession, getProfile, checkSessionAndGetProfile)
 * - Session utilities (getSession, restoreSession, getAuthenticatedAgent)
 * - Configuration metadata (isEpdsEnabled, publicUrl, isLoopback)
 *
 * Designed for the single-file setup pattern:
 *
 * ```typescript
 * // lib/auth.ts
 * import { createAuthSetup } from "@gainforest/atproto-auth-next";
 * import { createClient } from "@supabase/supabase-js";
 *
 * const supabase = createClient(
 *   process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   process.env.SUPABASE_SERVICE_ROLE_KEY!
 * );
 *
 * export const auth = createAuthSetup({
 *   privateKeyJwk: process.env.ATPROTO_JWK_PRIVATE!,
 *   cookieSecret: process.env.COOKIE_SECRET!,
 *   supabase,
 *   appId: "myapp",
 *   clientName: "My App",
 *   defaultPdsDomain: "climateai.org",
 *   epds: process.env.NEXT_PUBLIC_EPDS_URL
 *     ? { url: process.env.NEXT_PUBLIC_EPDS_URL }
 *     : undefined,
 *   onCallback: { redirectTo: "/" },
 * });
 * ```
 */

type AuthSetupConfig = {
    /**
     * Private JWK as a JSON string (the `ATPROTO_JWK_PRIVATE` env var).
     * Must be an EC P-256 key used for client authentication and JWKS.
     */
    privateKeyJwk: string;
    /**
     * Secret for iron-session cookie encryption. Must be at least 32 characters.
     */
    cookieSecret: string;
    /**
     * Supabase client (server-side, service role key).
     */
    supabase: SupabaseClient;
    /**
     * Unique identifier for this app in the shared Supabase tables.
     * e.g. "bumicerts", "myapp"
     */
    appId: string;
    /**
     * The app's public URL. Should be resolved by the consuming app from its
     * own environment variables (e.g. VERCEL_URL) and passed in here.
     * Falls back to "https://placeholder.invalid" at build time if omitted.
     */
    publicUrl?: string;
    /**
     * OAuth scope. Defaults to "atproto transition:generic".
     */
    scope?: string;
    /**
     * App name shown in OAuth consent and client metadata. Defaults to "Gainforest".
     */
    clientName?: string;
    /**
     * Cookie name for the app session. Defaults to "gainforest_session".
     */
    cookieName?: string;
    /**
     * Whether to set the cookie `Secure` flag. Should be set by the consuming
     * app (e.g. `NODE_ENV === "production"`). Defaults to false if not provided.
     */
    cookieSecure?: boolean;
    /**
     * Enable debug logging for this auth setup. Defaults to false.
     * Pass true when you want verbose auth logs (e.g. `DEBUG === "1"`).
     */
    debug?: boolean;
    /**
     * Default PDS domain for handle normalization.
     * When set, "alice" → "alice.{defaultPdsDomain}".
     * e.g. "climateai.org"
     */
    defaultPdsDomain?: string;
    /**
     * ePDS configuration. When provided, email-based OAuth is enabled.
     * The ePDS login/callback route handlers are wired automatically.
     */
    epds?: {
        /** ePDS base URL (e.g. https://climateai.org). */
        url: string;
    };
    /**
     * Redirect paths after OAuth callbacks. Defaults to "/".
     */
    onCallback?: {
        redirectTo: string;
    };
    /**
     * Redirect path after logout. If not set, logout returns `{ ok: true }`.
     */
    onLogout?: {
        redirectTo?: string;
    };
    /**
     * Logo URI shown on OAuth consent screens.
     * e.g. "https://example.com/logo.png"
     */
    logoUri?: string;
    /**
     * Brand color (hex) for OAuth consent screens.
     * e.g. "#2FCE8A"
     */
    brandColor?: string;
    /**
     * Background color (hex) for OAuth consent screens.
     * e.g. "#FFFFFF"
     */
    backgroundColor?: string;
    /**
     * Email template URI for OTP emails (ePDS).
     * e.g. "https://example.com/email-template.html"
     */
    emailTemplateUri?: string;
    /**
     * Email subject template for OTP emails (ePDS).
     * Supports placeholders: {{code}}, {{app_name}}
     * e.g. "{{code}} — Your {{app_name}} sign-in code"
     */
    emailSubjectTemplate?: string;
    /**
     * Terms of service URI.
     */
    tosUri?: string;
    /**
     * Privacy policy URI.
     */
    policyUri?: string;
};
type RouteHandler = (req: NextRequest) => Promise<Response | void>;
type NoopHandler = () => never;
type AuthSetup = {
    /** The underlying NodeOAuthClient (for advanced use). */
    oauthClient: NodeOAuthClient;
    /** iron-session configuration (for advanced use). */
    sessionConfig: SessionConfig;
    /** Route handlers — re-export these from your API route files. */
    handlers: {
        /** Mount at: /api/oauth/authorize (POST) */
        authorize: {
            POST: RouteHandler;
        };
        /** Mount at: /api/oauth/callback (GET) */
        callback: {
            GET: RouteHandler;
        };
        /** Mount at: /api/oauth/logout (POST) */
        logout: {
            POST: RouteHandler;
        };
        /** Mount at: /client-metadata.json (GET) */
        clientMetadata: {
            GET: (req: NextRequest) => Response;
        };
        /** Mount at: /.well-known/jwks.json (GET) */
        jwks: {
            GET: () => Response;
        };
        /**
         * ePDS handlers. Only operational when `epds.url` is configured.
         * If ePDS is not configured, calling these handlers throws an error.
         */
        epds: {
            /** Mount at: /api/oauth/epds/login (GET) */
            login: {
                GET: RouteHandler | NoopHandler;
            };
            /** Mount at: /api/oauth/epds/callback (GET) */
            callback: {
                GET: RouteHandler | NoopHandler;
            };
        };
    };
    /**
     * Server action factories — wrap these in a "use server" file.
     *
     * @example
     * ```typescript
     * // actions/auth.ts
     * "use server";
     * import { auth } from "@/lib/auth";
     * export const authorize = auth.actions.authorize;
     * export const logout = auth.actions.logout;
     * export const checkSession = auth.actions.checkSession;
     * export const checkSessionAndGetProfile = auth.actions.checkSessionAndGetProfile;
     * ```
     */
    actions: AuthActions;
    /** Session utilities for use in server-side code. */
    session: {
        /**
         * Read the current session from the encrypted cookie.
         * Returns `{ isLoggedIn: false }` if no session exists.
         */
        getSession: () => Promise<AnySession>;
        /**
         * Restore the OAuth session from Supabase for a given DID.
         * Returns `null` if the session is gone (user must re-authenticate).
         */
        restoreSession: (did: string) => Promise<Awaited<ReturnType<NodeOAuthClient["restore"]>> | null>;
        /**
         * Get an authenticated @atproto/api Agent for a given DID.
         * Returns `null` if the session cannot be restored.
         */
        getAuthenticatedAgent: (did: string) => Promise<Agent | null>;
        /** Save a session to the encrypted cookie. */
        saveSession: (data: {
            did: string;
            handle: string;
            isLoggedIn: true;
        }) => Promise<void>;
        /** Clear the session cookie (logout). */
        clearSession: () => Promise<void>;
    };
    /** Resolved public URL used for this setup. */
    publicUrl: string;
    /** Whether the resolved URL is a loopback (127.0.0.1/localhost). */
    isLoopback: boolean;
    /** Whether ePDS email-based auth is enabled. */
    isEpdsEnabled: boolean;
};
/**
 * Creates the complete auth setup for a Next.js application.
 *
 * Returns route handlers, server actions, and session utilities — all
 * wired together from a single configuration object.
 */
declare function createAuthSetup(config: AuthSetupConfig): AuthSetup;
/** @deprecated Use createAuthSetup() instead. */
type OAuthSetupConfig = {
    publicUrl: string;
    privateKeyJwk: string;
    cookieSecret: string;
    cookieName?: string;
    secure?: boolean;
    supabase: SupabaseClient;
    appId: string;
};
/** @deprecated Use createAuthSetup() instead. */
type OAuthSetup = {
    oauthClient: NodeOAuthClient;
    sessionConfig: SessionConfig;
};
/** @deprecated Use createAuthSetup() instead. */
declare function createOAuthSetup({ publicUrl, privateKeyJwk, cookieSecret, cookieName, secure, supabase, appId, }: OAuthSetupConfig): OAuthSetup;

export { type AuthActions as A, type OAuthSetup as O, type SessionConfig as S, type AuthSetup as a, type AuthSetupConfig as b, createAuthSetup as c, type AuthActionsConfig as d, type OAuthSetupConfig as e, createAuthActions as f, createOAuthSetup as g };
