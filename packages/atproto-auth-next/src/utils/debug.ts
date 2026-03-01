/**
 * Debug logger for @gainforest/atproto-auth-next.
 *
 * Enabled by setting AUTH_DEBUG=1 (or any truthy value) in the environment.
 * All output is prefixed with [atproto-auth] so it's easy to filter.
 *
 * @example
 *   AUTH_DEBUG=1 bun dev
 */

const isEnabled =
  typeof process !== "undefined" &&
  (process.env.AUTH_DEBUG === "1" || process.env.AUTH_DEBUG === "true");

export const debug = {
  log(label: string, data?: unknown): void {
    if (!isEnabled) return;
    if (data !== undefined) {
      console.log(`[atproto-auth] ${label}`, data);
    } else {
      console.log(`[atproto-auth] ${label}`);
    }
  },

  warn(label: string, data?: unknown): void {
    if (!isEnabled) return;
    if (data !== undefined) {
      console.warn(`[atproto-auth] ${label}`, data);
    } else {
      console.warn(`[atproto-auth] ${label}`);
    }
  },

  error(label: string, data?: unknown): void {
    // Errors always log regardless of AUTH_DEBUG flag
    if (data !== undefined) {
      console.error(`[atproto-auth] ${label}`, data);
    } else {
      console.error(`[atproto-auth] ${label}`);
    }
  },
};
