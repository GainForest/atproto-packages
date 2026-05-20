import { clientEnv } from "@/lib/env/client";

export function getCentralAuthBaseUrlClient(): string | null {
  return clientEnv.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, "") ?? null;
}

export function getCurrentReturnToUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function buildCentralLoginUrl(options: {
  handle?: string;
  email?: string;
}): string | null {
  const authBaseUrl = getCentralAuthBaseUrlClient();
  if (!authBaseUrl) {
    return null;
  }

  const url = new URL("/login", authBaseUrl);
  url.searchParams.set("returnTo", getCurrentReturnToUrl());

  if (clientEnv.NEXT_PUBLIC_AUTH_PROVIDER) {
    url.searchParams.set("provider", clientEnv.NEXT_PUBLIC_AUTH_PROVIDER);
  }

  if (options.handle) {
    url.searchParams.set("handle", options.handle);
  }

  if (options.email) {
    url.searchParams.set("email", options.email);
  }

  return url.toString();
}

export function buildCentralLogoutUrl(): string | null {
  const authBaseUrl = getCentralAuthBaseUrlClient();
  if (!authBaseUrl) {
    return null;
  }

  const url = new URL("/logout", authBaseUrl);
  url.searchParams.set("returnTo", getCurrentReturnToUrl());
  return url.toString();
}
