/**
 * Environment Variable Configuration
 *
 * Single source of truth for all environment variables used in the bumicerts app.
 * Validated at build time via the import in next.config.ts.
 *
 * Usage:
 *   import { env } from "@/lib/env";
 *   env.RESEND_API_KEY
 *   env.NEXT_PUBLIC_INDEXER_URL
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // ─── Server-side variables (never exposed to the browser) ──────────────────

  server: {
    // Node / Runtime
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Vercel system (server-side variant, auto-injected by Vercel)
    VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional(),

    // ATProto OAuth
    ATPROTO_JWK_PRIVATE: z.string().min(1),
    COOKIE_SECRET: z.string().min(32),

    // PDS admin credentials
    PDS_ADMIN_IDENTIFIER: z.string().min(1),
    PDS_ADMIN_PASSWORD: z.string().min(1),
    INVITE_CODES_PASSWORD: z.string().min(1),

    // Supabase (server-side service role)
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // Legacy key name used in app/api/supabase/client.ts
    SUPABASE_KEY: z.string().min(1),

    // AWS S3
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().default("us-east-1"),
    AWS_S3_BUCKET: z.string().min(1),

    // Email (Resend)
    RESEND_API_KEY: z.string().startsWith("re_"),

    // External AI / Brand APIs (optional — graceful fallback when absent)
    GEMINI_API_KEY: z.string().min(1).optional(),
    BRANDFETCH_API_KEY: z.string().min(1).optional(),

    // Database
    POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING: z.string().url(),

    // Security / Rate-limiting
    RATE_LIMIT_HMAC_KEY: z.string().min(32),
    RATE_LIMIT_FAIL_OPEN: z.string().optional(),

    // Debug flag (opt-in verbose logging)
    DEBUG: z.string().optional(),
  },

  // ─── Client-side variables (prefixed NEXT_PUBLIC_, bundled to the browser) ─

  client: {
    // Indexer (GraphQL API)
    NEXT_PUBLIC_INDEXER_URL: z
      .string()
      .url()
      .default("http://localhost:4000/graphql"),

    // Supabase (public/anon credentials)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // ATProto / PDS config
    NEXT_PUBLIC_ATPROTO_SERVICE_URL: z.string().url().optional(),
    NEXT_PUBLIC_EPDS_URL: z.string().url().optional(),

    // Base URL override (ngrok, custom domains, etc.)
    NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

    // Vercel system (client-side auto-injected variables)
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional(),
    NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },

  // ─── Runtime env mapping ────────────────────────────────────────────────────
  // Next.js requires every variable to be explicitly referenced here so the
  // bundler can inline the values. Client vars must be destructured; server
  // vars are auto-available via process.env on the server.

  runtimeEnv: {
    // Server
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    ATPROTO_JWK_PRIVATE: process.env.ATPROTO_JWK_PRIVATE,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    PDS_ADMIN_IDENTIFIER: process.env.PDS_ADMIN_IDENTIFIER,
    PDS_ADMIN_PASSWORD: process.env.PDS_ADMIN_PASSWORD,
    INVITE_CODES_PASSWORD: process.env.INVITE_CODES_PASSWORD,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    BRANDFETCH_API_KEY: process.env.BRANDFETCH_API_KEY,
    POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING:
      process.env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING,
    RATE_LIMIT_HMAC_KEY: process.env.RATE_LIMIT_HMAC_KEY,
    RATE_LIMIT_FAIL_OPEN: process.env.RATE_LIMIT_FAIL_OPEN,
    DEBUG: process.env.DEBUG,

    // Client
    NEXT_PUBLIC_INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ATPROTO_SERVICE_URL:
      process.env.NEXT_PUBLIC_ATPROTO_SERVICE_URL,
    NEXT_PUBLIC_EPDS_URL: process.env.NEXT_PUBLIC_EPDS_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  },

  /**
   * Skip validation during `next build` when running in CI without secrets.
   * Set SKIP_ENV_VALIDATION=1 in CI build steps where the app is only being
   * type-checked/bundled and runtime secrets are intentionally absent.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
