import { Agent } from "@atproto/api";
import { createClient } from "@supabase/supabase-js";
import {
  createOAuthClient,
  DEFAULT_OAUTH_SCOPE,
  isLoopback,
} from "@gainforest/atproto-auth-next/oauth";
import {
  createSupabaseSessionStore,
  createSupabaseStateStore,
} from "@gainforest/atproto-auth-next/stores";
import { authBaseUrl, env } from "./env.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const extraRedirectUris = env.NEXT_PUBLIC_EPDS_URL
  ? [`${authBaseUrl}/api/oauth/epds/callback`]
  : [];

export const oauthClient = createOAuthClient({
  publicUrl: authBaseUrl,
  privateKeyJwk: env.ATPROTO_JWK_PRIVATE,
  sessionStore: createSupabaseSessionStore(supabase, env.AUTH_APP_ID),
  stateStore: createSupabaseStateStore(supabase, env.AUTH_APP_ID),
  scope: DEFAULT_OAUTH_SCOPE,
  extraRedirectUris,
  clientName: "GainForest",
});

export async function resolveHandle(session: Awaited<ReturnType<typeof oauthClient.callback>>["session"]): Promise<string> {
  try {
    const agent = new Agent(session);
    const { data } = await agent.com.atproto.repo.describeRepo({ repo: session.did });
    return data.handle;
  } catch {
    return session.did;
  }
}

function publicJwks() {
  const parsed = JSON.parse(env.ATPROTO_JWK_PRIVATE) as Record<string, unknown>;
  const rawKey = Array.isArray(parsed.keys)
    ? (parsed.keys[0] as Record<string, unknown>)
    : parsed;
  if (!rawKey.kid) {
    rawKey.kid = "default";
  }
  const { d: _privateKey, ...publicKey } = rawKey;
  return { keys: [publicKey] };
}

export const jwks = publicJwks();

export function clientMetadata(requestUrl: URL) {
  const url = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUris = [
    `${url}/api/oauth/callback`,
    ...(env.NEXT_PUBLIC_EPDS_URL ? [`${url}/api/oauth/epds/callback`] : []),
  ];
  const scope = DEFAULT_OAUTH_SCOPE;

  const commonFields: Record<string, unknown> = {
    client_name: "GainForest",
    client_uri: url,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope,
    dpop_bound_access_tokens: true,
    jwks_uri: `${url}/.well-known/jwks.json`,
    logo_uri: `${authBaseUrl}/icon.svg`,
    background_color: "#FFFFFF",
    tos_uri: `${authBaseUrl}/terms`,
    policy_uri: `${authBaseUrl}/privacy`,
    epds_handle_mode: "random",
    epds_skip_consent_on_signup: true,
  };

  if (isLoopback(authBaseUrl)) {
    const params = new URLSearchParams();
    params.set("scope", scope);
    for (const uri of redirectUris) {
      params.append("redirect_uri", uri);
    }

    return {
      client_id: `http://localhost?${params.toString()}`,
      ...commonFields,
      token_endpoint_auth_method: "none",
      application_type: "native",
    };
  }

  return {
    client_id: `${url}/client-metadata.json`,
    ...commonFields,
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    application_type: "web",
  };
}

export function normalizeHandle(handle: string): string {
  return handle.includes(".") || !env.DEFAULT_PDS_DOMAIN
    ? handle
    : `${handle}.${env.DEFAULT_PDS_DOMAIN}`;
}
