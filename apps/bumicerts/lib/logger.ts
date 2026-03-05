/**
 * Debug logger that only outputs when DEBUG=true and NOT in production.
 * 
 * Uses Vercel system env variables:
 * - VERCEL_ENV: "production" | "preview" | "development" (set automatically by Vercel)
 * - DEBUG: manually set env variable to enable verbose logging
 * 
 * In local dev, VERCEL_ENV is undefined so we check NODE_ENV instead.
 */
import { env } from "@/lib/env";

const isProduction =
  env.VERCEL_ENV === "production" ||
  (!env.VERCEL_ENV && env.NODE_ENV === "production");

const isDebug = env.DEBUG === "true" && !isProduction;

export const debug = {
  log: (...args: unknown[]) => { if (isDebug) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDebug) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDebug) console.error(...args); },
};
