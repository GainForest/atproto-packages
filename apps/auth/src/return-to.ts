import { authBaseUrl, env } from "./env.js";

function configuredReturnOrigins(): Set<string> {
  const origins = env.AUTH_ALLOWED_RETURN_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(origins ?? []);
}

function isDefaultAllowedOrigin(url: URL): boolean {
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLoopback) {
    return false;
  }

  return (
    url.hostname === "gainforest.app" ||
    url.hostname.endsWith(".gainforest.app") ||
    isLoopback
  );
}

export function parseSafeReturnTo(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (configuredReturnOrigins().has(url.origin) || isDefaultAllowedOrigin(url)) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function fallbackReturnTo(): string {
  return new URL("/", authBaseUrl).toString();
}
