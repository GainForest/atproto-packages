import { Agent } from "@atproto/api";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

let cachedSupabase: {
  url: string;
  serviceRoleKey: string;
  client: SupabaseClient;
} | null = null;

let cachedOAuthClient: {
  authBaseUrl: string;
  privateKeyJwk: string;
  appId: string;
  epdsCallbackEnabled: boolean;
  client: ReturnType<typeof createOAuthClient>;
} | null = null;

let cachedJwks: {
  privateKeyJwk: string;
  value: { keys: Array<Record<string, unknown>> };
} | null = null;

function getSupabase(): SupabaseClient {
  if (
    cachedSupabase &&
    cachedSupabase.url === env.SUPABASE_URL &&
    cachedSupabase.serviceRoleKey === env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return cachedSupabase.client;
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  cachedSupabase = {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    client,
  };
  return client;
}

function hasEpdsCallback(): boolean {
  return !!(env.AUTH_DEFAULT_EPDS_URL || env.AUTH_EPDS_PROVIDERS);
}

export function getOAuthClient(): ReturnType<typeof createOAuthClient> {
  const epdsCallbackEnabled = hasEpdsCallback();
  if (
    cachedOAuthClient &&
    cachedOAuthClient.authBaseUrl === authBaseUrl &&
    cachedOAuthClient.privateKeyJwk === env.ATPROTO_JWK_PRIVATE &&
    cachedOAuthClient.appId === env.AUTH_APP_ID &&
    cachedOAuthClient.epdsCallbackEnabled === epdsCallbackEnabled
  ) {
    return cachedOAuthClient.client;
  }

  const extraRedirectUris = epdsCallbackEnabled
    ? [`${authBaseUrl}/api/oauth/epds/callback`]
    : [];
  const supabase = getSupabase();
  const client = createOAuthClient({
    publicUrl: authBaseUrl,
    privateKeyJwk: env.ATPROTO_JWK_PRIVATE,
    sessionStore: createSupabaseSessionStore(supabase, env.AUTH_APP_ID),
    stateStore: createSupabaseStateStore(supabase, env.AUTH_APP_ID),
    scope: DEFAULT_OAUTH_SCOPE,
    extraRedirectUris,
    clientName: "GainForest",
  });

  cachedOAuthClient = {
    authBaseUrl,
    privateKeyJwk: env.ATPROTO_JWK_PRIVATE,
    appId: env.AUTH_APP_ID,
    epdsCallbackEnabled,
    client,
  };
  return client;
}

type OAuthCallbackSession = Awaited<ReturnType<ReturnType<typeof getOAuthClient>["callback"]>>["session"];

type ProfileData = {
  handle?: string;
  displayName?: string;
  avatar?: string;
};

export async function resolveHandle(session: OAuthCallbackSession): Promise<string> {
  try {
    const agent = new Agent(session);
    const { data } = await agent.com.atproto.repo.describeRepo({ repo: session.did });
    return data.handle;
  } catch {
    return session.did;
  }
}

export async function resolveProfile(session: OAuthCallbackSession): Promise<ProfileData | undefined> {
  try {
    const agent = new Agent(session);
    const { data } = await agent.app.bsky.actor.getProfile({ actor: session.did });
    return {
      handle: data.handle,
      displayName: data.displayName,
      avatar: data.avatar,
    };
  } catch {
    return undefined;
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

export function getJwks(): { keys: Array<Record<string, unknown>> } {
  if (cachedJwks?.privateKeyJwk === env.ATPROTO_JWK_PRIVATE) {
    return cachedJwks.value;
  }

  const value = publicJwks();
  cachedJwks = { privateKeyJwk: env.ATPROTO_JWK_PRIVATE, value };
  return value;
}

export function clientMetadata(requestUrl: URL) {
  const url = `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUris = [
    `${url}/api/oauth/callback`,
    ...(hasEpdsCallback() ? [`${url}/api/oauth/epds/callback`] : []),
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
