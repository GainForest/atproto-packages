import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildSessionOptions, type SessionConfig } from "./config";
import type { AnySession, SessionData } from "./types";

export async function getSession(config: SessionConfig): Promise<AnySession> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  if (!session.isLoggedIn) {
    return { isLoggedIn: false };
  }

  return {
    isLoggedIn: true,
    did: (session as SessionData).did,
    handle: (session as SessionData).handle,
  };
}

export async function saveSession(
  data: SessionData,
  config: SessionConfig
): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  (session as SessionData).did = data.did;
  (session as SessionData).handle = data.handle;
  (session as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

  await session.save();
}

/**
 * Saves the session cookie directly onto a NextResponse object.
 *
 * Use this in route handlers that end with a redirect — calling the normal
 * saveSession() (which uses next/headers cookies()) won't flush the cookie
 * when the response is a redirect thrown via redirect() from next/navigation.
 * This version sets the Set-Cookie header directly on the response.
 */
export async function saveSessionToResponse(
  data: SessionData,
  config: SessionConfig,
  req: NextRequest,
  res: NextResponse,
): Promise<void> {
  const session = await getIronSession<AnySession>(req, res, buildSessionOptions(config));

  (session as SessionData).did = data.did;
  (session as SessionData).handle = data.handle;
  (session as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

  await session.save();
}

export async function clearSession(config: SessionConfig): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  session.destroy();
}
