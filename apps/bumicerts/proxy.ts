import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getProxyBlockResult } from "@/lib/proxy-guards";

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)",
  ],
};
