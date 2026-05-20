import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  AUTH_BASE_URL: z.string().url().default("http://localhost:3002"),
  AUTH_APP_ID: z.string().min(1).default("gainforest-auth"),
  AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  AUTH_ALLOWED_RETURN_ORIGINS: z.string().min(1).optional(),
  AUTH_EPDS_PROVIDERS: z.string().min(1).optional(),
  ATPROTO_JWK_PRIVATE: z.string().min(1),
  COOKIE_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_EPDS_URL: z.string().url().optional(),
  DEFAULT_PDS_DOMAIN: z.string().min(1).optional(),
  DEBUG: z.string().optional(),
  SKIP_ENV_VALIDATION: z.string().optional(),
});

export type AuthEnv = z.output<typeof envSchema>;

function parseEnv(source: Record<string, string | undefined>): AuthEnv {
  const fallbackEnv = envSchema.partial().parse(source);

  return source.SKIP_ENV_VALIDATION
    ? {
        NODE_ENV: fallbackEnv.NODE_ENV ?? "development",
        PORT: fallbackEnv.PORT ?? 3002,
        AUTH_BASE_URL: fallbackEnv.AUTH_BASE_URL ?? "http://localhost:3002",
        AUTH_APP_ID: fallbackEnv.AUTH_APP_ID ?? "gainforest-auth",
        AUTH_COOKIE_DOMAIN: fallbackEnv.AUTH_COOKIE_DOMAIN,
        AUTH_ALLOWED_RETURN_ORIGINS: fallbackEnv.AUTH_ALLOWED_RETURN_ORIGINS,
        AUTH_EPDS_PROVIDERS: fallbackEnv.AUTH_EPDS_PROVIDERS,
        ATPROTO_JWK_PRIVATE: fallbackEnv.ATPROTO_JWK_PRIVATE ?? "{}",
        COOKIE_SECRET:
          fallbackEnv.COOKIE_SECRET ?? "development-cookie-secret-placeholder-32",
        SUPABASE_URL: fallbackEnv.SUPABASE_URL ?? "http://localhost:54321",
        SUPABASE_SERVICE_ROLE_KEY: fallbackEnv.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder",
        NEXT_PUBLIC_EPDS_URL: fallbackEnv.NEXT_PUBLIC_EPDS_URL,
        DEFAULT_PDS_DOMAIN: fallbackEnv.DEFAULT_PDS_DOMAIN,
        DEBUG: fallbackEnv.DEBUG,
        SKIP_ENV_VALIDATION: fallbackEnv.SKIP_ENV_VALIDATION,
      }
    : envSchema.parse(source);
}

export let env = parseEnv({ SKIP_ENV_VALIDATION: "true" });
export let isProduction = env.NODE_ENV === "production";
export let authBaseUrl = env.AUTH_BASE_URL.replace(/\/$/, "");

export function configureEnv(source: Record<string, string | undefined>): AuthEnv {
  env = parseEnv(source);
  isProduction = env.NODE_ENV === "production";
  authBaseUrl = env.AUTH_BASE_URL.replace(/\/$/, "");
  return env;
}
