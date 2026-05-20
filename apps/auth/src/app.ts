import { clientMetadata, getJwks, getOAuthClient, normalizeHandle, resolveHandle, resolveProfile } from "./auth.js";
import {
  clearReturnToCookie,
  clearSessionCookie,
  readCookie,
  readSession,
  returnToCookieName,
  setReturnToCookie,
  setSessionCookie,
} from "./cookies.js";
import { authBaseUrl } from "./env.js";
import { hasEpdsProviders, resolveEpdsProvider } from "./epds-providers.js";
import { htmlResponse, jsonResponse, methodNotAllowed, notFound, redirectResponse } from "./http.js";
import { fallbackReturnTo, parseSafeReturnTo } from "./return-to.js";

function cacheControl(response: Response, value: string): Response {
  response.headers.set("cache-control", value);
  return response;
}

function home(): Response {
  return htmlResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>GainForest Auth</title></head>
<body style="font-family:system-ui;margin:4rem auto;max-width:520px">
<h1>GainForest Auth</h1>
<p>This service centralizes GainForest ATProto sign-in.</p>
<p><a href="/login">Sign in</a></p>
</body></html>`);
}

function loginForm(returnTo: string, error: string | null): Response {
  return htmlResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in to GainForest</title></head>
<body style="font-family:system-ui;margin:4rem auto;max-width:420px">
<h1>Sign in to GainForest</h1>
<p>Use your ATProto handle or email account.</p>
${error ? '<p style="color:crimson">Sign-in failed. Please try again.</p>' : ""}
<p><a href="${escapeHtml(returnTo)}">Return to app</a></p>
<form method="get" action="/login" style="display:grid;gap:12px">
<input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="email">
<button type="submit">Continue with email</button>
</form>
<hr style="margin:2rem 0">
<form method="get" action="/login" style="display:grid;gap:12px">
<input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">
<label for="handle">ATProto handle</label>
<input id="handle" name="handle" type="text" autocomplete="username">
<button type="submit">Continue with handle</button>
</form>
</body></html>`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function appendAuthError(returnTo: string, error: string): string {
  const url = new URL(returnTo);
  url.searchParams.set("auth_error", error);
  return url.toString();
}

function authErrorRedirect(request: Request, error: string): Response {
  const returnTo = parseSafeReturnTo(readCookie(request, returnToCookieName));
  if (returnTo && returnTo !== fallbackReturnTo()) {
    return redirectResponse(appendAuthError(returnTo, error));
  }

  return redirectResponse(`/login?error=${encodeURIComponent(error)}`);
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { value: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause instanceof Error
      ? {
          name: error.cause.name,
          message: error.cause.message,
          stack: error.cause.stack,
        }
      : error.cause,
  };
}

async function login(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const returnTo =
    parseSafeReturnTo(url.searchParams.get("returnTo")) ??
    parseSafeReturnTo(readCookie(request, returnToCookieName)) ??
    fallbackReturnTo();
  const email = url.searchParams.get("email")?.trim();
  const handle = url.searchParams.get("handle")?.trim();
  const provider = url.searchParams.get("provider")?.trim();
  const error = url.searchParams.get("error")?.trim();

  if (error && returnTo !== fallbackReturnTo()) {
    return redirectResponse(appendAuthError(returnTo, error));
  }

  if (email) {
    const redirectUrl = new URL("/api/oauth/epds/login", authBaseUrl);
    redirectUrl.searchParams.set("email", email);
    if (provider) {
      redirectUrl.searchParams.set("provider", provider);
    }

    const response = redirectResponse(
      `${redirectUrl.pathname}${redirectUrl.search}`,
    );
    setReturnToCookie(response, returnTo);
    return response;
  }

  if (handle) {
    try {
      const authUrl = await getOAuthClient().authorize(normalizeHandle(handle), {
        scope: "atproto transition:generic",
      });
      const response = redirectResponse(authUrl.toString());
      setReturnToCookie(response, returnTo);
      return response;
    } catch (error) {
      console.error("[auth] Handle login failed", {
        handle,
        normalizedHandle: normalizeHandle(handle),
        error: serializeError(error),
      });
      const response = redirectResponse(appendAuthError(returnTo, "auth_failed"));
      setReturnToCookie(response, returnTo);
      return response;
    }
  }

  const response = loginForm(returnTo, error ?? null);
  setReturnToCookie(response, returnTo);
  return response;
}

async function epdsLogin(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }
  if (!hasEpdsProviders()) {
    return authErrorRedirect(request, "epds_not_configured");
  }

  const epdsUrl = resolveEpdsProvider(url.searchParams.get("provider")?.trim() ?? null);
  if (!epdsUrl) {
    return authErrorRedirect(request, "unknown_epds_provider");
  }

  try {
    const authUrl = await getOAuthClient().authorize(epdsUrl, {
      scope: "atproto transition:generic",
      prompt: "login",
    });
    const redirectUrl = new URL(authUrl.toString());
    const email = url.searchParams.get("email")?.trim();
    if (email) {
      redirectUrl.searchParams.set("login_hint", email);
    }
    return redirectResponse(redirectUrl.toString());
  } catch {
    return authErrorRedirect(request, "auth_failed");
  }
}

async function oauthCallback(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const { session } = await getOAuthClient().callback(url.searchParams);
    const handle = await resolveHandle(session);
    const returnTo =
      parseSafeReturnTo(readCookie(request, returnToCookieName)) ?? fallbackReturnTo();
    const response = redirectResponse(returnTo);
    await setSessionCookie(response, {
      isLoggedIn: true,
      did: session.did,
      handle,
    });
    clearReturnToCookie(response);
    return response;
  } catch {
    return authErrorRedirect(request, "auth_failed");
  }
}

async function sessionResponse(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const session = await readSession(request);
  if (!session) {
    return jsonResponse({ isLoggedIn: false });
  }

  const oauthSession = await getOAuthClient().restore(session.did).catch(() => null);
  if (!oauthSession) {
    const response = jsonResponse({ isLoggedIn: false });
    clearSessionCookie(response);
    return response;
  }

  const profile = await resolveProfile(oauthSession).catch(() => undefined);

  return jsonResponse({
    isLoggedIn: true,
    did: session.did,
    handle: session.handle,
    profile,
  });
}

async function logout(request: Request, url: URL): Promise<Response> {
  const session = await readSession(request);
  if (session) {
    await getOAuthClient().revoke(session.did).catch(() => undefined);
  }

  const returnTo = parseSafeReturnTo(url.searchParams.get("returnTo")) ?? fallbackReturnTo();
  const response = request.method === "POST"
    ? jsonResponse({ success: true })
    : redirectResponse(returnTo);
  clearSessionCookie(response);
  clearReturnToCookie(response);
  return response;
}

function icon(): Response {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#123d2f"/><path d="M33 10c10 8 15 16 15 25 0 11-7 19-16 19s-16-8-16-19c0-9 6-17 17-25Z" fill="#8ee6a8"/><path d="M32 50V24" stroke="#123d2f" stroke-width="4" stroke-linecap="round"/></svg>',
    { headers: { "content-type": "image/svg+xml" } },
  );
}

export async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    return home();
  }
  if (url.pathname === "/icon.svg") {
    return icon();
  }
  if (url.pathname === "/login") {
    return login(request, url);
  }
  if (url.pathname === "/logout") {
    return logout(request, url);
  }
  if (url.pathname === "/api/auth/logout") {
    return request.method === "POST" ? logout(request, url) : methodNotAllowed();
  }
  if (url.pathname === "/api/auth/session") {
    return cacheControl(await sessionResponse(request), "no-store");
  }
  if (url.pathname === "/api/oauth/callback" || url.pathname === "/api/oauth/epds/callback") {
    return oauthCallback(request, url);
  }
  if (url.pathname === "/api/oauth/epds/login") {
    return epdsLogin(request, url);
  }
  if (url.pathname === "/client-metadata.json") {
    return cacheControl(jsonResponse(clientMetadata(url)), "no-store");
  }
  if (url.pathname === "/.well-known/jwks.json") {
    return cacheControl(jsonResponse(getJwks()), "public, max-age=3600");
  }

  return notFound();
}
