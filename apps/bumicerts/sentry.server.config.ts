/**
 * Sentry server-side (Node runtime) initialization.
 * Loaded by `instrumentation.ts` when `NEXT_RUNTIME === "nodejs"`.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry/scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

Sentry.init({
  dsn,
  environment,

  // PII off — see instrumentation-client.ts for rationale. Cookies,
  // Authorization headers, and FormData bodies stay out of Sentry events
  // unless code explicitly attaches them via Sentry.setContext.
  sendDefaultPii: false,

  tracesSampleRate: environment === "production" ? 0.1 : 1.0,

  // Only propagate sentry-trace / baggage to our own origin so we don't
  // leak trace IDs to third-party APIs (Supabase, S3, ATProto PDSes, ...).
  tracePropagationTargets: [/^\//],

  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,

  debug: false,
});
