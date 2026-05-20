import { sealData, unsealData } from "iron-session";
import { env, isProduction } from "./env.js";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const sessionCookieName = isProduction
  ? "__Secure_gainforest_session"
  : "gainforest_session";
export const returnToCookieName = "gainforest_auth_return_to";

export type AppSession = {
  isLoggedIn: true;
  did: string;
  handle: string;
};

function parseCookieHeader(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) {
    return map;
  }

  for (const part of header.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    map.set(rawName, decodeURIComponent(rawValueParts.join("=")));
  }

  return map;
}

export function readCookie(request: Request, name: string): string | null {
  return parseCookieHeader(request.headers.get("cookie")).get(name) ?? null;
}

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  domain?: string;
  maxAge?: number;
};

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export function appendSetCookie(response: Response, cookie: string): Response {
  response.headers.append("set-cookie", cookie);
  return response;
}

export function sessionCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/",
    domain: env.AUTH_COOKIE_DOMAIN,
    maxAge,
  };
}

export function hostCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/",
    maxAge,
  };
}

export async function sealSession(session: AppSession): Promise<string> {
  return sealData(session, {
    password: env.COOKIE_SECRET,
    ttl: SESSION_MAX_AGE_SECONDS,
  });
}

export async function readSession(request: Request): Promise<AppSession | null> {
  const sealed = readCookie(request, sessionCookieName);
  if (!sealed) {
    return null;
  }

  try {
    const session = await unsealData<unknown>(sealed, {
      password: env.COOKIE_SECRET,
      ttl: SESSION_MAX_AGE_SECONDS,
    });

    if (
      typeof session === "object" &&
      session !== null &&
      "isLoggedIn" in session &&
      session.isLoggedIn === true &&
      "did" in session &&
      typeof session.did === "string" &&
      "handle" in session &&
      typeof session.handle === "string"
    ) {
      return {
        isLoggedIn: true,
        did: session.did,
        handle: session.handle,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function setSessionCookie(response: Response, session: AppSession) {
  appendSetCookie(
    response,
    serializeCookie(
      sessionCookieName,
      await sealSession(session),
      sessionCookieOptions(SESSION_MAX_AGE_SECONDS),
    ),
  );
}

export function clearSessionCookie(response: Response) {
  appendSetCookie(
    response,
    serializeCookie(sessionCookieName, "", sessionCookieOptions(0)),
  );
}

export function setReturnToCookie(response: Response, returnTo: string) {
  appendSetCookie(
    response,
    serializeCookie(returnToCookieName, returnTo, hostCookieOptions(10 * 60)),
  );
}

export function clearReturnToCookie(response: Response) {
  appendSetCookie(
    response,
    serializeCookie(returnToCookieName, "", hostCookieOptions(0)),
  );
}
