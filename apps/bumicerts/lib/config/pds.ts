/**
 * PDS Configuration
 *
 * Two separate concerns:
 *
 * 1. SIGN-UP domains  — PDSes we control for app-managed account defaults.
 *    - Production:        gainforest.id
 *    - Non-prod (dev/staging/preview): gainforest.id, climateai.org
 *
 * 2. SIGN-IN domains  — dropdown options shown in the login modal.
 *    Users may authenticate from any ATProto PDS; we show the most common ones
 *    and also allow a custom "type your own" entry.
 *    - Production:        gainforest.id, certified.app, bsky.social
 *    - Non-prod:          same + climateai.org (for internal testing accounts)
 *
 * Rule: "climateai.org" is NEVER shown to production users in any dropdown.
 * However it is a valid PDS domain and will work fine if a user types it.
 */

import { clientEnv as env } from "@/lib/env/client";

const isProduction = env.NEXT_PUBLIC_VERCEL_ENV === "production";

// ─── Sign-up (app-managed default PDSes) ─────────────────────────────────────

const PRODUCTION_SIGNUP_DOMAINS = ["gainforest.id"] as const;
const DEV_SIGNUP_DOMAINS = ["climateai.org"] as const;

const signupPdsDomains = isProduction
  ? PRODUCTION_SIGNUP_DOMAINS
  : DEV_SIGNUP_DOMAINS;

/** The PDS we create new accounts on by default (always gainforest.id). */
export const defaultSignupPdsDomain: string = signupPdsDomains[0];

// ─── Sign-in (dropdown options shown in the login modal) ─────────────────────

const COMMON_LOGIN_DOMAINS = [
  "gainforest.id",
  "certified.app",
  "bsky.social",
] as const;

const DEV_LOGIN_DOMAINS = [
  "gainforest.id",
  "climateai.org",
  "certified.app",
  "bsky.social",
] as const;

export const loginPDSDomains = isProduction
  ? COMMON_LOGIN_DOMAINS
  : DEV_LOGIN_DOMAINS;

export type LoginPDSDomain = (typeof loginPDSDomains)[number];

/**
 * Validates a custom PDS domain string entered by the user.
 * Must be of the form `something.tld` — at least one dot, no spaces,
 * only valid hostname characters.
 */
export function isValidPdsDomain(domain: string): boolean {
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(domain.trim());
}
