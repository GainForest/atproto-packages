const TRUSTED_PREVIEW_USER_AGENTS = [
  "slackbot",
  "slack-imgproxy",
  "twitterbot",
  "facebookexternalhit",
  "linkedinbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "skypeuripreview",
] as const;

const BLOCKED_BOT_USER_AGENTS = [
  "gptbot",
  "chatgpt-user",
  "claudebot",
  "anthropic-ai",
  "ccbot",
  "cohere-ai",
  "perplexitybot",
  "perplexity-user",
  "bytespider",
  "amazonbot",
  "petalbot",
  "applebot-extended",
  "google-extended",
  "diffbot",
  "omgili",
] as const;

const GENERIC_BOT_USER_AGENT_PATTERN = /\b(bot|crawler|spider|scraper)\b/i;
const DID_ROUTE_SEGMENT_PATTERN = /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/i;
const HANDLE_ROUTE_SEGMENT_PATTERN = /^(?=.{3,253}$)(?!.*\.\.)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i;
const DRAFT_ID_ROUTE_SEGMENT_PATTERN = /^\d+$/;
const BUMICERT_RKEY_PATTERN = /^[A-Za-z0-9._:~-]+$/;

const PROXY_BYPASS_PREFIXES = [
  "/api/",
  "/.well-known/",
  "/bumicert/create/api/",
] as const;
const PROXY_BYPASS_PATHS = new Set(["/client-metadata.json"]);

export type ProxyBlockReason =
  | "blocked-bot-user-agent"
  | "invalid-account-did-or-handle"
  | "invalid-bumicert-draft-id"
  | "invalid-bumicert-id";

export type ProxyBlockResult = {
  status: 403 | 404;
  reason: ProxyBlockReason;
};

type ProxyGuardInput = {
  method: string;
  pathname: string;
  userAgent: string | null;
};

export function getProxyBlockResult({
  method,
  pathname,
  userAgent,
}: ProxyGuardInput): ProxyBlockResult | null {
  if (!shouldInspectProxyRequest(method, pathname)) {
    return null;
  }

  if (isBlockedBotUserAgent(userAgent ?? "")) {
    return {
      status: 403,
      reason: "blocked-bot-user-agent",
    };
  }

  const invalidPathReason = getInvalidPathReason(pathname);

  if (invalidPathReason) {
    return {
      status: 404,
      reason: invalidPathReason,
    };
  }

  return null;
}

export function isBlockedBotUserAgent(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.trim().toLowerCase();

  if (!normalizedUserAgent) {
    return false;
  }

  if (includesAny(normalizedUserAgent, TRUSTED_PREVIEW_USER_AGENTS)) {
    return false;
  }

  return (
    includesAny(normalizedUserAgent, BLOCKED_BOT_USER_AGENTS) ||
    GENERIC_BOT_USER_AGENT_PATTERN.test(normalizedUserAgent)
  );
}

export function shouldInspectProxyRequest(
  method: string,
  pathname: string,
): boolean {
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  if (PROXY_BYPASS_PATHS.has(pathname)) {
    return false;
  }

  return !PROXY_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function getInvalidPathReason(pathname: string): Exclude<
  ProxyBlockReason,
  "blocked-bot-user-agent"
> | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "account" && segments[1]) {
    const didOrHandle = safeDecodePathSegment(segments[1]);

    if (!didOrHandle || !isValidAccountRouteIdentifier(didOrHandle)) {
      return "invalid-account-did-or-handle";
    }

    return null;
  }

  if (segments[0] !== "bumicert" || !segments[1]) {
    return null;
  }

  if (segments[1] === "create") {
    if (!segments[2]) {
      return null;
    }

    const draftId = safeDecodePathSegment(segments[2]);

    return draftId && DRAFT_ID_ROUTE_SEGMENT_PATTERN.test(draftId)
      ? null
      : "invalid-bumicert-draft-id";
  }

  const bumicertId = safeDecodePathSegment(segments[1]);

  return bumicertId && isValidBumicertRouteId(bumicertId)
    ? null
    : "invalid-bumicert-id";
}

function safeDecodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isValidAccountRouteIdentifier(value: string): boolean {
  return DID_ROUTE_SEGMENT_PATTERN.test(value) || HANDLE_ROUTE_SEGMENT_PATTERN.test(value);
}

function isValidBumicertRouteId(value: string): boolean {
  const separatorIndex = value.indexOf("-");

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return false;
  }

  const did = value.slice(0, separatorIndex);
  const rkey = value.slice(separatorIndex + 1);

  return DID_ROUTE_SEGMENT_PATTERN.test(did) && BUMICERT_RKEY_PATTERN.test(rkey);
}
