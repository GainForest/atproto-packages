/**
 * Public URL resolution utilities.
 *
 * The public URL must be provided explicitly at initialization time by the
 * consuming app — this package does not read process.env directly.
 *
 * Note: Loopback detection is URL-based. This correctly handles ngrok/tunnel
 * URLs in development where NODE_ENV is 'development' but the URL is publicly
 * accessible.
 */

/**
 * Normalize the public URL provided at setup time.
 *
 * @param explicitUrl - The URL resolved by the consuming app (e.g. from VERCEL_URL).
 */
export function resolvePublicUrl(explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  // Build-time fallback — used when no URL is provided (e.g. during next build).
  // Using .invalid TLD (RFC 2606) ensures loud failure if accidentally used at runtime.
  return "https://placeholder.invalid";
}

/**
 * Returns true if the given URL is a loopback address (127.0.0.1 or localhost).
 *
 * Used to select between the loopback OAuth client (RFC 8252 native app)
 * and the production web OAuth client.
 */
export function isLoopback(url: string): boolean {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

/**
 * Derives the public base URL from an incoming NextRequest.
 *
 * Uses the request's own URL (which Vercel sets correctly per-deployment),
 * falling back to the configured publicUrl. This ensures that OAuth
 * redirect_uris and client_ids always match the deployment the user is
 * actually on, not a hardcoded URL baked in at build time.
 *
 * Loopback normalisation: Next.js dev server always binds to `localhost`
 * internally, so `req.url` may contain `localhost` even when the browser
 * navigated to `127.0.0.1`. RFC 8252 (and ePDS) require loopback
 * redirect_uris to use `127.0.0.1`, so we replace `localhost` with
 * `127.0.0.1` for any loopback origin.
 */
export function resolveRequestPublicUrl(
  req: { url: string },
  fallbackPublicUrl: string,
): string {
  try {
    const parsed = new URL(req.url);
    // Use the origin (protocol + host) of the actual incoming request,
    // normalising localhost → 127.0.0.1 so ePDS redirect_uri validation passes.
    const origin = parsed.origin.replace("localhost", "127.0.0.1");
    return origin;
  } catch {
    return fallbackPublicUrl;
  }
}
