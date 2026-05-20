import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { oauthClient, clientMetadata, jwks, normalizeHandle, resolveHandle } from "./auth.js";
import {
  clearReturnToCookie,
  clearSessionCookie,
  readCookie,
  readSession,
  returnToCookieName,
  setReturnToCookie,
  setSessionCookie,
} from "./cookies.js";
import { authBaseUrl, env } from "./env.js";
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

async function login(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const returnTo = parseSafeReturnTo(url.searchParams.get("returnTo")) ?? fallbackReturnTo();
  const email = url.searchParams.get("email")?.trim();
  const handle = url.searchParams.get("handle")?.trim();
  const provider = url.searchParams.get("provider")?.trim();

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
      const authUrl = await oauthClient.authorize(normalizeHandle(handle), {
        scope: "atproto transition:generic",
      });
      const response = redirectResponse(authUrl.toString());
      setReturnToCookie(response, returnTo);
      return response;
    } catch {
      const response = redirectResponse(
        `/login?returnTo=${encodeURIComponent(returnTo)}&error=auth_failed`,
      );
      setReturnToCookie(response, returnTo);
      return response;
    }
  }

  const response = loginForm(returnTo, url.searchParams.get("error"));
  setReturnToCookie(response, returnTo);
  return response;
}

async function epdsLogin(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }
  if (!hasEpdsProviders()) {
    return redirectResponse("/login?error=epds_not_configured");
  }

  const epdsUrl = resolveEpdsProvider(url.searchParams.get("provider")?.trim() ?? null);
  if (!epdsUrl) {
    return redirectResponse("/login?error=unknown_epds_provider");
  }

  try {
    const authUrl = await oauthClient.authorize(epdsUrl, {
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
    return redirectResponse("/login?error=auth_failed");
  }
}

async function oauthCallback(request: Request, url: URL): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const { session } = await oauthClient.callback(url.searchParams);
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
    return redirectResponse("/login?error=auth_failed");
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

  const oauthSession = await oauthClient.restore(session.did).catch(() => null);
  if (!oauthSession) {
    const response = jsonResponse({ isLoggedIn: false });
    clearSessionCookie(response);
    return response;
  }

  return jsonResponse({
    isLoggedIn: true,
    did: session.did,
    handle: session.handle,
  });
}

async function logout(request: Request, url: URL): Promise<Response> {
  const session = await readSession(request);
  if (session) {
    await oauthClient.revoke(session.did).catch(() => undefined);
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

async function route(request: Request): Promise<Response> {
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
    return cacheControl(jsonResponse(jwks), "public, max-age=3600");
  }

  return notFound();
}

async function nodeRequestToWebRequest(message: IncomingMessage): Promise<Request> {
  const host = message.headers.host ?? "localhost";
  const protocol = message.headers["x-forwarded-proto"]?.toString() ?? "http";
  const url = `${protocol}://${host}${message.url ?? "/"}`;
  const headers = new Headers();

  for (const [name, value] of Object.entries(message.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of message) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  return new Request(url, {
    method: message.method,
    headers,
    body,
  });
}

async function sendWebResponse(response: Response, serverResponse: ServerResponse) {
  serverResponse.statusCode = response.status;
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithCookies.getSetCookie?.() ?? [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      serverResponse.setHeader(key, value);
    }
  });
  if (setCookies.length > 0) {
    serverResponse.setHeader("set-cookie", setCookies);
  }

  if (!response.body) {
    serverResponse.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  serverResponse.end(body);
}

createServer(async (message, serverResponse) => {
  try {
    const request = await nodeRequestToWebRequest(message);
    await sendWebResponse(await route(request), serverResponse);
  } catch (error) {
    console.error("[auth] Unhandled request error", error);
    serverResponse.statusCode = 500;
    serverResponse.end("Internal server error");
  }
}).listen(env.PORT, () => {
  console.log(`[auth] listening on ${authBaseUrl} (port ${env.PORT})`);
});
