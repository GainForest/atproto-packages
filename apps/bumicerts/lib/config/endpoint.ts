import { clientEnv as env } from "@/lib/env/client";

const localhost = "http://localhost:3000";

export const BASE_URL = (() => {
  // In development, use localhost
  if (!env.NEXT_PUBLIC_VERCEL_ENV) {
    return localhost;
  }

  // In production, use the production URL if available
  if (
    env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
    env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // For preview deployments (and fallback), use the deployment URL
  return `https://${env.NEXT_PUBLIC_VERCEL_URL}`;
})();
