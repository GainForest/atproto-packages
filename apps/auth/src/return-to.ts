import { authBaseUrl, env } from "./env.js";

function configuredReturnOrigins(): string[] {
  return env.AUTH_ALLOWED_RETURN_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

function isConfiguredAllowedOrigin(url: URL): boolean {
  return configuredReturnOrigins().some((origin) => {
    if (origin === url.origin) {
      return true;
    }

    if (origin === "http://localhost:*" && url.protocol === "http:" && url.hostname === "localhost") {
      return true;
    }

    if (origin === "http://127.0.0.1:*" && url.protocol === "http:" && url.hostname === "127.0.0.1") {
      return true;
    }

    return false;
  });
}

function isDefaultAllowedOrigin(url: URL): boolean {
  if (url.protocol !== "https:") {
    return false;
  }

  return url.hostname === "gainforest.app" || url.hostname.endsWith(".gainforest.app");
}

export function parseSafeReturnTo(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (isConfiguredAllowedOrigin(url) || isDefaultAllowedOrigin(url)) {
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
