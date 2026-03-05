/**
 * Client-side environment variables.
 * Safe to import in "use client" files, shared components, and any module
 * that may be bundled into the browser. Contains only NEXT_PUBLIC_* variables.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const clientEnv = createEnv({
  server: {},

  client: {
    // Indexer (GraphQL API)
    NEXT_PUBLIC_INDEXER_URL: z
      .string()
      .url()
      .default("http://localhost:4000/graphql"),

    // Supabase (public/anon credentials)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // ATProto / PDS
    NEXT_PUBLIC_ATPROTO_SERVICE_URL: z.string().url().optional(),
    NEXT_PUBLIC_EPDS_URL: z.string().url().optional(),

    // Base URL override (ngrok, custom domains, etc.)
    NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

    // Vercel system (auto-injected)
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(["development", "preview", "production"])
      .optional(),
    NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ATPROTO_SERVICE_URL: process.env.NEXT_PUBLIC_ATPROTO_SERVICE_URL,
    NEXT_PUBLIC_EPDS_URL: process.env.NEXT_PUBLIC_EPDS_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
