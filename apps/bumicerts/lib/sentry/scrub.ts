/**
 * Sentry event scrubber.
 *
 * Strips sensitive data from events before they leave the process. Runs in
 * all three runtimes (browser, Node, Edge), so this file must stay pure JS:
 * no Node APIs, no DOM APIs.
 *
 * Two layers of scrubbing:
 *
 * 1. URL params — OAuth callback URLs carry `code=` (authorization code) and
 *    `state=` (CSRF token). Other places may carry `access_token`, etc.
 *    We scrub these out of request.url, error messages, and breadcrumb urls.
 *
 * 2. Object keys — defense in depth against secrets accidentally landing in
 *    `event.extra` / `event.contexts`. Catches ATProto / facilitator /
 *    Supabase / AWS / iron-session field names that Sentry's built-in
 *    denylist doesn't know about.
 */

import type { Event } from "@sentry/nextjs";

const SENSITIVE_URL_PARAM =
  /([#?&])(code|state|access_token|id_token|refresh_token|token|api_key|session|password|secret)=[^&#]*/gi;

const SENSITIVE_KEY =
  /jwk|private[_-]?key|cookie[_-]?secret|facilitator[_-]?(?:password|private[_-]?key)|hmac[_-]?key|service[_-]?role[_-]?key|aws[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|^password$|^secret$|^cookie$|^authorization$/i;

const FILTERED = "[Filtered]";

function scrubUrl(url: string): string {
  return url.replace(SENSITIVE_URL_PARAM, `$1$2=${FILTERED}`);
}

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (value !== null && typeof value === "object") {
    return scrubRecord(value as Record<string, unknown>);
  }

  return value;
}

function scrubRecord(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = FILTERED;
      continue;
    }
    out[key] = scrubValue(raw);
  }
  return out;
}

/**
 * Scrubs a Sentry event in place and returns it. Pass this from `beforeSend`
 * and `beforeSendTransaction`.
 */
export function scrubEvent<E extends Event>(event: E): E {
  if (event.request?.url) {
    event.request.url = scrubUrl(event.request.url);
  }

  if (typeof event.message === "string") {
    event.message = scrubUrl(event.message);
  }

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = scrubUrl(exception.value);
      }
    }
  }

  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb.data && typeof crumb.data === "object") {
        const data = crumb.data as Record<string, unknown>;
        if (typeof data.url === "string") {
          data.url = scrubUrl(data.url);
        }
      }
    }
  }

  if (event.extra) {
    event.extra = scrubRecord(event.extra);
  }

  if (event.contexts) {
    event.contexts = scrubRecord(event.contexts) as typeof event.contexts;
  }

  return event;
}
