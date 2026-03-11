import { clientEnv as env } from "@/lib/env/client";

const localhost = "http://localhost:3000";

export const BASE_URL = !env.NEXT_PUBLIC_VERCEL_ENV
  ? localhost
  : `https://${env.NEXT_PUBLIC_VERCEL_URL}`;
