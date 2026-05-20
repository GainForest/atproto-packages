/**
 * Next.js instrumentation hook — runs once per runtime at server start.
 * Used here to bootstrap Sentry for both the Node and Edge runtimes.
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors thrown inside React Server Components, route handlers,
// middleware, and the Next.js render pipeline.
export const onRequestError = Sentry.captureRequestError;
