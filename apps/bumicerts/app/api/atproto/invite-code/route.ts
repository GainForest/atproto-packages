import { signupPDSDomains } from "@/lib/config/pds";
import { serverEnv as env } from "@/lib/env/server";
import { NextRequest } from "next/server";
import postgres from "postgres";
import { z } from "zod";

// Force dynamic so Next.js never tries to statically collect this route
export const dynamic = "force-dynamic";

type XrpcInviteResponse = {
  codes: Array<{ account: string; codes: string[] }>;
};

const inviteCodeRequestSchema = z
  .object({
    email: z.string().trim().email().optional(),
    emails: z.array(z.string().trim().email()).min(1).optional(),
    password: z.string().min(1),
  })
  .refine((value) => value.email !== undefined || value.emails !== undefined, {
    message: "Missing required email(s)",
    path: ["emails"],
  });

const xrpcInviteResponseSchema: z.ZodType<XrpcInviteResponse> = z.object({
  codes: z.array(
    z.object({
      account: z.string().min(1),
      codes: z.array(z.string().min(1)),
    }),
  ),
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
  const sql = postgres(env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING, { ssl: "require" });

  try {
    const json = await req.json().catch(() => null);
    const parsedBody = inviteCodeRequestSchema.safeParse(json);

    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: "BadRequest", message: "Invalid request body", issues: parsedBody.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = parsedBody.data;

    const emailsInput =
      Array.isArray(body.emails) && body.emails.length > 0 ? body.emails
      : body.email ? [body.email]
      : [];

    const emails = Array.from(new Set(emailsInput.map((email) => email.toLowerCase())));

    // hard code use count so that only one use per invite code
    const useCount = 1;

    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: "BadRequest", message: "Missing required email(s)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(useCount) || useCount <= 0) {
      return new Response(JSON.stringify({ error: "BadRequest", message: "`useCount` must be a positive integer" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin = env.INVITE_CODES_PASSWORD === (body.password ?? "");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Invalid admin credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = `https://${signupPDSDomains[0]}`;
    const adminBasic = Buffer.from(
      `${env.PDS_ADMIN_IDENTIFIER}:${env.PDS_ADMIN_PASSWORD}`
    ).toString("base64");

    // so N codes for N emails with use count being 1
    const codeCount = emails.length;

    const response = await fetch(`${service}/xrpc/com.atproto.server.createInviteCodes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${adminBasic}`,
      },
      body: JSON.stringify({ codeCount, useCount }),
    });

    if (!response.ok) {
      const error = await readJsonResponse(response);
      return new Response(
        JSON.stringify(error),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const responseData = await readJsonResponse(response);
    const parsedResponse = xrpcInviteResponseSchema.safeParse(responseData);

    if (!parsedResponse.success) {
      return new Response(
        JSON.stringify({ error: "UpstreamError", message: "Invite service returned an invalid response" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const minted = parsedResponse.data.codes[0]?.codes ?? [];

    if (!Array.isArray(minted) || minted.length < emails.length) {
      return new Response(
        JSON.stringify({
          error: "UpstreamError",
          message: `PDS returned ${minted.length || 0} code(s) for ${emails.length} email(s)`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pair first N codes to N emails; insert all mappings in parallel
    let results: { email: string; inviteCode: string }[];
    try {
      results = await Promise.all(
        emails.map(async (email, i) => {
          const inviteCode = minted[i];
          await sql`
            INSERT INTO invites (email, invite_token, pds_domain)
            VALUES (${email}, ${inviteCode}, ${signupPDSDomains[0]})
          `;
          return { email, inviteCode };
        })
      );
    } catch (dbErr) {
      console.error("Failed to insert invite(s):", dbErr);
      return new Response(
        JSON.stringify({ error: "DatabaseError", message: "Failed to persist invite(s)" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ invites: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error occurred";
    return new Response(
      JSON.stringify({
        error: "InternalServerError",
        message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
