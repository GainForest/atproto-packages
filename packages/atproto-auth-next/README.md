# @gainforest/atproto-auth-next

ATProto OAuth authentication for Next.js. Handles the full auth lifecycle: OAuth client setup, Supabase-backed token storage, encrypted cookie sessions, and agent construction for PDS calls.

## Install

```bash
bun add @gainforest/atproto-auth-next @supabase/supabase-js
```

`next` must already be installed. `@supabase/supabase-js` is required if you use the Supabase stores (you almost certainly do).

---

## What's in the box

| Export path | What you get |
|---|---|
| `@gainforest/atproto-auth-next` | `createOAuthClient`, `NodeOAuthClient`, session types |
| `@gainforest/atproto-auth-next/server` | `getSession`, `saveSession`, `clearSession`, `getReadAgent`, `getWriteAgent`, `Agent` |
| `@gainforest/atproto-auth-next/stores` | `createSupabaseSessionStore`, `createSupabaseStateStore`, `cleanupExpiredStates` |
| `@gainforest/atproto-auth-next/client` | Session types only — safe in client components |

---

## Supabase setup

Run this SQL once in your Supabase project before anything else.

```sql
-- Long-lived OAuth tokens, keyed by app + DID
CREATE TABLE atproto_oauth_session (
  id          TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL,
  did         TEXT NOT NULL,
  value       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, did)
);
CREATE INDEX idx_atproto_oauth_session_app_did ON atproto_oauth_session(app_id, did);

-- Short-lived state, expires after 1 hour
CREATE TABLE atproto_oauth_state (
  id          TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL,
  value       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);
CREATE INDEX idx_atproto_oauth_state_app_expires ON atproto_oauth_state(app_id, expires_at);
```

---

## Environment variables

```env
# Your app's public base URL (no trailing slash)
NEXT_PUBLIC_APP_URL=https://your-app.com

# ES256 private key JWK — generate instructions below
OAUTH_PRIVATE_KEY='{"kty":"EC","crv":"P-256",...}'

# iron-session cookie encryption — minimum 32 characters
COOKIE_SECRET=a-long-random-string-at-least-32-chars

# Optional — defaults to "gainforest_session"
COOKIE_NAME=your_app_session

# Supabase (service role key is server-only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Generating the OAuth private key

```bash
# Using Node.js / Bun
node -e "
const { generateKeyPairSync } = require('crypto');
const { exportJWK } = require('jose');
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
exportJWK(privateKey).then(jwk => {
  jwk.kid = 'key-1'; jwk.use = 'sig'; jwk.alg = 'ES256';
  console.log('OAUTH_PRIVATE_KEY=' + JSON.stringify(JSON.stringify(jwk)));
});
"
```

Never paste your private key into an online tool.

---

## Step 1 — Create the OAuth client (`lib/atproto.ts`)

This is the singleton that drives the entire auth flow. Create it once and import it server-side wherever you need it.

```ts
// lib/atproto.ts  (server-only — never import in client components)
import { createOAuthClient } from "@gainforest/atproto-auth-next";
import {
  createSupabaseSessionStore,
  createSupabaseStateStore,
} from "@gainforest/atproto-auth-next/stores";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = "your-app-name"; // unique per app — e.g. "greenglobe", "bumicerts"

export const oauthClient = createOAuthClient({
  publicUrl: process.env.NEXT_PUBLIC_APP_URL!,
  privateKeyJwk: process.env.OAUTH_PRIVATE_KEY!,
  sessionStore: createSupabaseSessionStore(supabase, APP_ID),
  stateStore: createSupabaseStateStore(supabase, APP_ID),
});
```

The `SessionConfig` used for cookie operations also needs to be exported from somewhere convenient:

```ts
// lib/session.ts
import type { SessionConfig } from "@gainforest/atproto-auth-next/server";

export const sessionConfig: SessionConfig = {
  cookieSecret: process.env.COOKIE_SECRET!,
  cookieName: process.env.COOKIE_NAME,
};
```

---

## Step 2 — Expose OAuth metadata routes

ATProto's authorization server fetches these to verify your client identity.

```ts
// app/client-metadata.json/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_APP_URL!;
  return NextResponse.json({
    client_id: `${url}/client-metadata.json`,
    client_name: "Your App",
    client_uri: url,
    redirect_uris: [`${url}/api/oauth/callback`],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: "atproto",
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    application_type: "web",
    dpop_bound_access_tokens: true,
    jwks_uri: `${url}/.well-known/jwks.json`,
  }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
```

```ts
// app/.well-known/jwks.json/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const { d, ...publicKey } = JSON.parse(process.env.OAUTH_PRIVATE_KEY!);
  return NextResponse.json({ keys: [publicKey] }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
```

---

## Step 3 — Auth routes

### Authorize

```ts
// app/api/oauth/authorize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { oauthClient } from "@/lib/atproto";

export async function POST(req: NextRequest) {
  const { handle } = await req.json();
  const authUrl = await oauthClient.authorize(handle, { scope: "atproto" });
  return NextResponse.json({ url: authUrl.toString() });
}
```

### Callback

```ts
// app/api/oauth/callback/route.ts
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { oauthClient } from "@/lib/atproto";
import { saveSession, Agent } from "@gainforest/atproto-auth-next/server";
import { sessionConfig } from "@/lib/session";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const result = await oauthClient.callback(params);

  // oauthSession only carries `did` — resolve the handle via the agent
  const agent = new Agent(result.session);
  const { data } = await agent.com.atproto.repo.describeRepo({ repo: result.session.did });

  await saveSession(
    { did: result.session.did, handle: data.handle, isLoggedIn: true },
    sessionConfig
  );

  redirect("/dashboard");
}
```

### Logout

```ts
// app/api/oauth/logout/route.ts
import { NextResponse } from "next/server";
import { getSession, clearSession } from "@gainforest/atproto-auth-next/server";
import { oauthClient } from "@/lib/atproto";
import { sessionConfig } from "@/lib/session";

export async function POST() {
  const session = await getSession(sessionConfig);

  if (session.isLoggedIn) {
    await oauthClient.revoke(session.did);
  }

  await clearSession(sessionConfig);
  return NextResponse.json({ ok: true });
}
```

> Always call `oauthClient.revoke()` before `clearSession()`. Clearing the cookie without revoking leaves the OAuth tokens alive in Supabase.

---

## Step 4 — Using the session

### Server Component

```tsx
// app/dashboard/page.tsx
import { getSession } from "@gainforest/atproto-auth-next/server";
import { redirect } from "next/navigation";
import { sessionConfig } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession(sessionConfig);

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  // session.did and session.handle are narrowed — fully typed, no `?.`
  return <h1>Hello, {session.handle}</h1>;
}
```

### Making authenticated PDS calls (server)

```ts
import { getSession, getWriteAgent } from "@gainforest/atproto-auth-next/server";
import { oauthClient } from "@/lib/atproto";
import { sessionConfig } from "@/lib/session";

export async function createRecord(record: unknown) {
  const session = await getSession(sessionConfig);

  if (!session.isLoggedIn) throw new Error("Not authenticated");

  const result = await getWriteAgent(oauthClient, session);

  if (!result.ok) {
    // result.error.code is "SESSION_EXPIRED"
    throw new Error("Session expired — please log in again");
  }

  return result.agent.com.atproto.repo.createRecord({
    repo: session.did,
    collection: "org.hypercerts.claim.activity",
    record,
  });
}
```

### Unauthenticated reads (server)

```ts
import { getReadAgent } from "@gainforest/atproto-auth-next/server";

const agent = getReadAgent("https://gainforest.id");
const profile = await agent.com.atproto.repo.describeRepo({ repo: did });
```

### Client component — reading session state

The client export contains only types — no `next/headers` code. Pass the session down from a Server Component as a prop, or fetch it via a server action.

```tsx
// components/user-menu.tsx
"use client";

import type { AnySession } from "@gainforest/atproto-auth-next/client";

export function UserMenu({ session }: { session: AnySession }) {
  if (!session.isLoggedIn) {
    return <a href="/login">Sign in</a>;
  }

  // session.handle is narrowed here — no `?.`
  return <span>{session.handle}</span>;
}
```

```tsx
// app/layout.tsx  (Server Component)
import { getSession } from "@gainforest/atproto-auth-next/server";
import { UserMenu } from "@/components/user-menu";
import { sessionConfig } from "@/lib/session";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(sessionConfig);
  return (
    <html>
      <body>
        <nav><UserMenu session={session} /></nav>
        {children}
      </body>
    </html>
  );
}
```

---

## Step 5 — Cleanup expired states (optional)

OAuth states expire after 1 hour and accumulate in the database. Run this on a schedule (cron, Supabase Edge Function, etc.):

```ts
import { cleanupExpiredStates } from "@gainforest/atproto-auth-next/stores";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, serviceRoleKey);
const deleted = await cleanupExpiredStates(supabase);
console.log(`Cleaned up ${deleted} expired OAuth states`);
```

---

## Local development

ATProto OAuth supports loopback URIs for local dev — no HTTPS required.

```env
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

The `createOAuthClient` factory passes this straight through to `NodeOAuthClient`, which handles loopback detection automatically.

---

## Type reference

```ts
// Discriminated union — TypeScript narrows on isLoggedIn
type SessionData  = { isLoggedIn: true;  did: string; handle: string };
type EmptySession = { isLoggedIn: false };
type AnySession   = SessionData | EmptySession;

// Passed to every cookie helper
type SessionConfig = {
  cookieSecret: string;  // min 32 chars
  cookieName?: string;   // default: "gainforest_session"
  secure?: boolean;      // default: NODE_ENV === "production"
};

// getWriteAgent return
type AgentError   = { code: "SESSION_EXPIRED" };
type AgentResult  = { ok: true; agent: Agent } | { ok: false; error: AgentError };
```
