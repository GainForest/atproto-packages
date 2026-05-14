/**
 * Sentry edge-runtime initialization.
 * Loaded by `instrumentation.ts` when `NEXT_RUNTIME === "edge"` (middleware,
 * edge routes). Keep this lean — the edge runtime has tight bundle limits.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry/scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

Sentry.init({
  dsn,
  environment,

  // PII off — see instrumentation-client.ts for rationale.
  sendDefaultPii: false,

  tracesSampleRate: environment === "production" ? 0.1 : 1.0,

  tracePropagationTargets: [/^\//],

  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,

  debug: false,
});
