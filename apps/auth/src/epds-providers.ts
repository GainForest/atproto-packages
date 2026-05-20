import { env } from "./env.js";

function parseProviderEntry(entry: string): [string, string] | null {
  const separatorIndex = entry.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const provider = entry.slice(0, separatorIndex).trim();
  const rawUrl = entry.slice(separatorIndex + 1).trim();
  if (!provider || !rawUrl) {
    return null;
  }

  try {
    return [provider, new URL(rawUrl).toString().replace(/\/$/, "")];
  } catch {
    return null;
  }
}

function buildEpdsProviderMap(): Map<string, string> {
  const map = new Map<string, string>();

  if (env.NEXT_PUBLIC_EPDS_URL) {
    map.set("default", env.NEXT_PUBLIC_EPDS_URL.replace(/\/$/, ""));
  }

  for (const entry of env.AUTH_EPDS_PROVIDERS?.split(",") ?? []) {
    const parsed = parseProviderEntry(entry.trim());
    if (parsed) {
      map.set(parsed[0], parsed[1]);
    }
  }

  return map;
}

const epdsProviders = buildEpdsProviderMap();

export function resolveEpdsProvider(provider: string | null): string | null {
  if (provider) {
    return epdsProviders.get(provider) ?? null;
  }

  if (epdsProviders.size === 1) {
    return [...epdsProviders.values()][0] ?? null;
  }

  return epdsProviders.get("default") ?? null;
}

export function hasEpdsProviders(): boolean {
  return epdsProviders.size > 0;
}
