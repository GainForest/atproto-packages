/**
 * Public URL resolution utilities.
 *
 * Resolves the app's public URL from environment variables, with Vercel
 * auto-detection and loopback detection for local development.
 *
 * Priority order:
 *   1. NEXT_PUBLIC_BASE_URL — explicit override (ngrok, custom domain, etc.)
 *   2. VERCEL_BRANCH_URL   — stable per-branch URL for preview deploys
 *   3. VERCEL_URL          — fallback Vercel auto-detected URL
 *   4. http://127.0.0.1:PORT — local development fallback
 *   5. https://placeholder.invalid — build-time fallback (never used at runtime)
 *
 * Note: Loopback detection is URL-based, not NODE_ENV-based. This correctly
 * handles ngrok/tunnel URLs in development where NODE_ENV is 'development'
 * but the URL is publicly accessible.
 */

/**
 * Resolve the public URL from env vars or an explicit override.
 *
 * @param explicitUrl - Pass this to skip env var lookup entirely (e.g. from config).
 */
export function resolvePublicUrl(explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3000";
    return `http://127.0.0.1:${port}`;
  }

  // Build-time fallback — next build evaluates modules at compile time when
  // no Vercel env vars are present. This placeholder will never be used at runtime.
  // Using .invalid TLD (RFC 2606) ensures loud failure if accidentally used.
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
