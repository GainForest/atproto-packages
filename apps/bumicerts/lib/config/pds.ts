/**
 * PDS Configuration
 *
 * Sign-up domains are PDSes we control for app-managed account defaults.
 * Sign-in accepts the user's full ATProto handle instead of choosing a PDS here.
 */

import { clientEnv as env } from "@/lib/env/client";

const isProduction = env.NEXT_PUBLIC_VERCEL_ENV === "production";

const PRODUCTION_SIGNUP_DOMAINS = ["gainforest.id"] as const;
const DEV_SIGNUP_DOMAINS = ["climateai.org"] as const;

const signupPdsDomains = isProduction
  ? PRODUCTION_SIGNUP_DOMAINS
  : DEV_SIGNUP_DOMAINS;

export const defaultSignupPdsDomain: string = signupPdsDomains[0];
