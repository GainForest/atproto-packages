import { headers } from "next/headers";
import { z } from "zod";
import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

const centralSessionSchema = z.object({
  isLoggedIn: z.boolean(),
  did: z.string().optional(),
  handle: z.string().optional(),
  profile: z
    .object({
      displayName: z.string().optional(),
      avatar: z.string().optional(),
      handle: z.string().optional(),
    })
    .optional(),
});

export type CentralSession = z.infer<typeof centralSessionSchema>;

export function getCentralAuthBaseUrl(): string | null {
  const value = serverEnv.AUTH_BASE_URL ?? clientEnv.NEXT_PUBLIC_AUTH_BASE_URL;
  return value ? value.replace(/\/$/, "") : null;
}

export async function getCentralSession(): Promise<CentralSession | null> {
  const authBaseUrl = getCentralAuthBaseUrl();
  if (!authBaseUrl) {
    return null;
  }

  const headerList = await headers();
  const cookie = headerList.get("cookie");
  const response = await fetch(`${authBaseUrl}/api/auth/session`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    return { isLoggedIn: false };
  }

  const parsed = centralSessionSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : { isLoggedIn: false };
}
