function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function buildTracePropagationTargets(
  ...origins: Array<string | undefined>
): RegExp[] {
  const normalizedOrigins = Array.from(
    new Set(origins.map((origin) => origin && normalizeOrigin(origin)).filter(Boolean)),
  ) as string[];

  return normalizedOrigins.map(
    (origin) => new RegExp(`^${escapeRegExp(origin)}(?:/|$)`),
  );
}
