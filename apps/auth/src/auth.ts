import type { AtprotoIdentityDidMethods, DidResolver, ResolvedDocument } from "@atproto-labs/did-resolver";
import { XrpcHandleResolver } from "@atproto-labs/handle-resolver";
import { AtprotoIdentityResolver } from "@atproto-labs/identity-resolver";
import { Agent } from "@atproto/api";
import { assertDidPlc, assertDidWeb, didDocumentValidator, didWebToUrl, type Did, type DidDocument } from "@atproto/did";
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

let cachedIdentityResolver: {
  handleResolverUrl: string;
  resolver: AtprotoIdentityResolver;
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

function workerCompatibleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const expectsRedirectError = input instanceof Request
    ? input.redirect === "error"
    : init?.redirect === "error";
  const request = input instanceof Request
    ? input
    : new Request(input, expectsRedirectError ? { ...init, redirect: "manual" } : init);
  const safeRequest = expectsRedirectError && request.redirect === "error"
    ? new Request(request, { redirect: "manual" })
    : request;

  return fetch(safeRequest).then((response) => {
    if (expectsRedirectError && response.status >= 300 && response.status < 400) {
      throw new TypeError("Redirects are not allowed for handle resolution");
    }

    return response;
  });
}

class WorkerDidResolver implements DidResolver<AtprotoIdentityDidMethods> {
  async resolve<D extends Did>(did: D): Promise<ResolvedDocument<D, AtprotoIdentityDidMethods>> {
    const url = did.startsWith("did:plc:")
      ? this.plcUrl(did)
      : this.webUrl(did);
    const response = await workerCompatibleFetch(url, {
      redirect: "error",
      headers: { accept: "application/did+ld+json,application/json" },
    });
    if (!response.ok) {
      throw new Error(`DID resolution failed for ${did}: ${response.status}`);
    }

    return didDocumentValidator.parse(await response.json()) as ResolvedDocument<D, AtprotoIdentityDidMethods>;
  }

  private plcUrl(did: string): URL {
    assertDidPlc(did);
    return new URL(`/${encodeURIComponent(did)}`, "https://plc.directory");
  }

  private webUrl(did: string): URL {
    assertDidWeb(did);
    const url = didWebToUrl(did);
    return url.pathname === "/"
      ? new URL("/.well-known/did.json", url)
      : new URL(`${url.pathname}/did.json`, url);
  }
}

function getIdentityResolver(): AtprotoIdentityResolver | undefined {
  if (isLoopback(authBaseUrl)) {
    return undefined;
  }

  if (cachedIdentityResolver?.handleResolverUrl === env.AUTH_HANDLE_RESOLVER_URL) {
    return cachedIdentityResolver.resolver;
  }

  const resolver = new AtprotoIdentityResolver(
    new WorkerDidResolver(),
    new XrpcHandleResolver(env.AUTH_HANDLE_RESOLVER_URL, {
      fetch: workerCompatibleFetch,
    }),
  );
  cachedIdentityResolver = {
    handleResolverUrl: env.AUTH_HANDLE_RESOLVER_URL,
    resolver,
  };
  return resolver;
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
    identityResolver: getIdentityResolver(),
    fetch: workerCompatibleFetch,
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
