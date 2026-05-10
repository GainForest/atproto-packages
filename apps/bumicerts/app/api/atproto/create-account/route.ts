import { NextRequest } from "next/server";
import { headers } from "next/headers";
import postgres from "postgres";
import { z } from "zod";
import { signupPDSDomains } from "@/lib/config/pds";
import { serverEnv } from "@/lib/env/server";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/rate-limit";

// Force dynamic so Next.js never tries to statically collect this route
export const dynamic = "force-dynamic";

const createAccountRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
  handle: z.string().trim().min(1),
  inviteCode: z.string().trim().min(1),
});

const createAccountResponseSchema = z.object({
  handle: z.string().min(1),
  did: z.string().min(1),
  accessJwt: z.string().min(1),
  refreshJwt: z.string().min(1),
});

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function POST(req: NextRequest) {
  const sql = postgres(serverEnv.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING, {
    ssl: "require",
  });
  const clientIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const { allowed, resetAt } = await checkRateLimit(
    `ip:${clientIp}`,
    "create-account",
    { maxAttempts: 5, windowMs: 60 * 60 * 1000 }
  );
  if (!allowed) {
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }
  await recordRateLimitAttempt(`ip:${clientIp}`, "create-account");

  try {
    const json = await req.json().catch(() => null);
    const parsedBody = createAccountRequestSchema.safeParse(json);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: "BadRequest",
          message: "Invalid request body",
          issues: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password, handle, inviteCode } = parsedBody.data;

    const inviteCodeInfo =
      await sql`SELECT * FROM invites WHERE invite_token = ${inviteCode}`;
    if (inviteCodeInfo.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invite code not found in db" }),
        { status: 400 }
      );
    }
    if (inviteCodeInfo[0].email !== email) {
      return new Response(
        JSON.stringify({ error: "Invite code does not match email" }),
        { status: 400 }
      );
    }

    const service = signupPDSDomains[0];

    const response = await fetch(
      `https://${service}/xrpc/com.atproto.server.createAccount`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, handle, inviteCode }),
      }
    );

    if (!response.ok) {
      const error = await readJsonResponse(response);
      console.error("Account creation failed:", error);
      return new Response(JSON.stringify(error), { status: response.status });
    }

    const data = await readJsonResponse(response);
    const parsedResponse = createAccountResponseSchema.safeParse(data);

    if (!parsedResponse.success) {
      console.error("Account creation returned invalid JSON:", parsedResponse.error.flatten());
      return new Response(
        JSON.stringify({ error: "UpstreamError", message: "Account service returned an invalid response" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsedResponse.data), { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message,
      }),
      { status: 500 }
    );
  }
}
