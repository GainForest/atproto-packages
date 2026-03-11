/**
 * ATProto Authentication Setup
 *
 * Single-file auth configuration using @gainforest/atproto-auth-next.
 * Provides:
 * - OAuth route handlers (authorize, callback, logout, client-metadata, jwks, ePDS)
 * - Server actions (authorize, logout, checkSession, getProfile, checkSessionAndGetProfile)
 * - Session utilities (getSession, restoreSession, getAuthenticatedAgent)
 *
 * @example
 * ```ts
 * // In API routes:
 * import { auth } from "@/lib/auth";
 * export const { POST } = auth.handlers.authorize;
 *
 * // In server actions:
 * import { auth } from "@/lib/auth";
 * const session = await auth.actions.checkSession();
 *
 * // In server components:
 * import { auth } from "@/lib/auth";
 * const session = await auth.session.getSession();
 * ```
 */

import { createClient } from "@supabase/supabase-js";
import { createAuthSetup } from "@gainforest/atproto-auth-next";
import { serverEnv as env } from "@/lib/env/server";
import { clientEnv } from "@/lib/env/client";
import { defaultSignupPdsDomain } from "@/lib/config/pds";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client (server-side with service role)
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// Auth setup — lazy so JSON.parse(privateKeyJwk) only runs at request time
// ─────────────────────────────────────────────────────────────────────────────

let _auth: ReturnType<typeof createAuthSetup> | null = null;

function getAuth() {
  if (_auth) return _auth;
  // Resolve publicUrl here in app code (server-only) so it survives Next.js
  // bundling. When the auth package is in transpilePackages, bare
  // process.env.VERCEL_URL inside the package gets statically replaced with
  // undefined at build time, causing "placeholder.invalid" on Vercel preview.
  // Reading it here (in a non-transpiled server file) is safe.
  // For OAuth redirect_uris and client_ids, the actual per-request URL is used
  // (derived from the Host header in each handler). This setup-time publicUrl
  // is only used for branding URIs (logo, tos, policy) which don't affect
  // OAuth correctness.
  const publicUrl =
    clientEnv.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  _auth = createAuthSetup({
    privateKeyJwk: env.ATPROTO_JWK_PRIVATE,
    cookieSecret: env.COOKIE_SECRET,
    supabase,
    appId: "bumicerts",
    clientName: "Bumicerts",
    cookieName: "bumicerts_session",
    defaultPdsDomain: defaultSignupPdsDomain,
    publicUrl,
    epds: clientEnv.NEXT_PUBLIC_EPDS_URL
      ? { url: clientEnv.NEXT_PUBLIC_EPDS_URL }
      : undefined,
    onCallback: { redirectTo: "/" },
    logoUri: publicUrl ? `${publicUrl}/assets/media/images/logo.png` : undefined,
    brandColor: "#2FCE8A",
    backgroundColor: "#FFFFFF",
    emailTemplateUri: publicUrl ? `${publicUrl}/assets/email/otp-template.html` : undefined,
    emailSubjectTemplate: "{{code}} - Your {{app_name}} sign-in code",
    tosUri: publicUrl ? `${publicUrl}/terms` : undefined,
    policyUri: publicUrl ? `${publicUrl}/privacy` : undefined,
  });
  return _auth;
}

/**
 * The main auth instance for the bumicerts app.
 *
 * Contains everything needed for ATProto OAuth:
 * - `auth.handlers.*` — Route handlers for API routes
 * - `auth.actions.*` — Server actions for client components
 * - `auth.session.*` — Session utilities for server-side code
 */
export const auth = new Proxy({} as ReturnType<typeof createAuthSetup>, {
  get(_target, prop) {
    return (getAuth() as Record<string | symbol, unknown>)[prop];
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-export for convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default PDS domain used for handle normalization.
 * Derived from the app's known signup PDS list — not an env variable.
 * "alice" becomes "alice.{defaultPdsDomain}".
 */
export const defaultPdsDomain = defaultSignupPdsDomain;
