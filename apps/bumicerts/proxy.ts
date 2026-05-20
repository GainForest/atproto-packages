import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getProxyBlockResult } from "@/lib/proxy-guards";
import {
  LANGUAGE_COOKIE_NAME,
  resolvePreferredLanguageFromHeader,
} from "@/lib/i18n/languages";

function appendRequestCookie(
  existingCookieHeader: string | null,
  name: string,
  value: string,
): string {
  const encodedCookie = `${name}=${encodeURIComponent(value)}`;
  return existingCookieHeader
    ? `${existingCookieHeader}; ${encodedCookie}`
    : encodedCookie;
}

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // Redirect localhost to 127.0.0.1 (required for ATProto OAuth loopback)
  if (hostname.startsWith("localhost:")) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = "127.0.0.1";
    redirectUrl.port = hostname.split(":")[1] || "3000";
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  const blockResult = getProxyBlockResult({
    method: request.method,
    pathname: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent"),
  });

  if (blockResult) {
    if (blockResult.status === 403) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return new NextResponse(null, { status: 404 });
  }

  const savedLocale = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
  if (savedLocale) return NextResponse.next();

  const detectedLocale = resolvePreferredLanguageFromHeader(
    request.headers.get("accept-language"),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    appendRequestCookie(
      request.headers.get("cookie"),
      LANGUAGE_COOKIE_NAME,
      detectedLocale,
    ),
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(LANGUAGE_COOKIE_NAME, detectedLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)",
  ],
};
