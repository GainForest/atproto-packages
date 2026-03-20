/**
 * Debug logger for @gainforest/atproto-auth-next.
 *
 * Enabled by calling configureDebug(true) during auth setup initialization.
 * All output is prefixed with [atproto-auth] so it's easy to filter.
 */

let isEnabled = false;

/**
 * Configure the debug logger. Called once at createAuthSetup() time.
 */
export function configureDebug(enabled: boolean): void {
  isEnabled = enabled;
}

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
