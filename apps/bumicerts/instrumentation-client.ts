/**
 * Sentry client-side initialization.
 * Runs in the browser when the app boots. Next.js auto-loads this file
 * (replaces the legacy `sentry.client.config.ts`).
 *
 * The DSN is read from `NEXT_PUBLIC_SENTRY_DSN`. When it's unset (e.g. in
 * local dev without Sentry configured), `Sentry.init` is a no-op.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry/scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

Sentry.init({
  dsn,
  environment,

  // PII off — we run an OAuth + financial app and don't want to ship
  // iron-session cookies, Authorization headers, or user IPs to Sentry.
  // Attach specific context with Sentry.setUser / setContext instead.
  sendDefaultPii: false,

  // Performance tracing — sample 10% in prod, 100% in dev when enabled.
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,

  // Only attach Sentry trace headers (sentry-trace, baggage) to our own
  // origin. Default would propagate them to every third-party fetch
  // (Supabase, S3, Resend, ATProto PDSes, ...).
  tracePropagationTargets: [/^\//],

  // Session Replay disabled. Even with input masking, replays of an OAuth
  // / donation flow can capture wallet addresses, donation amounts, and
  // other DOM content visible to the user at the time of error. Re-enable
  // intentionally once we've decided what to mask.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,

  debug: false,
});

// Instrument client-side router navigations so they show up as transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
