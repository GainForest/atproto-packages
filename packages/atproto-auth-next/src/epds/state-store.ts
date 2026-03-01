import type { SupabaseClient } from "@supabase/supabase-js";
import { debug } from "../utils/debug";

/** State stored between ePDS login and callback. */
export interface EpdsOAuthState {
  /** PKCE code verifier (plain text, not hashed). */
  codeVerifier: string;
  /** DPoP private JWK — must include the `d` parameter. Stored as a plain object. */
  dpopPrivateJwk: Record<string, unknown>;
}

const TABLE = "atproto_oauth_state";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a Supabase-backed ephemeral state store for the ePDS OAuth flow.
 *
 * Stores the PKCE code verifier and DPoP private JWK between the login
 * initiation and callback. Uses delete-on-read semantics for security —
 * only one concurrent callback request can win.
 *
 * Reuses the existing `atproto_oauth_state` table with a namespaced app_id
 * (e.g. `{appId}-epds`) to avoid key collisions with the SDK's own state.
 */
export function createEpdsStateStore(supabase: SupabaseClient, appId: string) {
  const compositeKey = (state: string) => `${appId}:${state}`;

  return {
    /**
     * Stores ePDS OAuth state with a 10-minute TTL.
     */
    async set(state: string, data: EpdsOAuthState): Promise<void> {
      const key = compositeKey(state);
      const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

      debug.log("[epds-state-store] SET", {
        key,
        hasCodeVerifier: !!data.codeVerifier,
        hasPrivateJwk: !!data.dpopPrivateJwk,
        expiresAt,
      });

      const { error } = await supabase.from(TABLE).upsert(
        {
          id: key,
          app_id: appId,
          value: data,
          expires_at: expiresAt,
        },
        { onConflict: "id" },
      );

      if (error) {
        throw new Error(`ePDS state store set failed: ${error.message}`);
      }
    },

    /**
     * Atomically deletes and returns the state (delete-on-read).
     *
     * Uses DELETE...RETURNING in a single round-trip — only one concurrent
     * request can succeed. Returns `undefined` if the state does not exist
     * or has already been consumed.
     */
    async get(state: string): Promise<EpdsOAuthState | undefined> {
      const key = compositeKey(state);

      const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", key)
        .select("value, expires_at")
        .single();

      // PGRST116 = no rows found (already consumed or never existed)
      if (error) {
        if (error.code === "PGRST116") {
          debug.log("[epds-state-store] GET", { key, found: false });
          return undefined;
        }
        throw new Error(`ePDS state store get failed: ${error.message}`);
      }

      const expired =
        data.expires_at ? new Date(data.expires_at) < new Date() : false;
      debug.log("[epds-state-store] GET", {
        key,
        found: true,
        expired,
        expiresAt: data.expires_at,
      });

      // Row is already deleted — reject if expired
      if (expired) {
        throw new Error("ePDS OAuth state has expired");
      }

      return data.value as EpdsOAuthState;
    },

    /**
     * Explicitly deletes state by key (for cleanup/error paths).
     */
    async del(state: string): Promise<void> {
      const key = compositeKey(state);
      debug.log("[epds-state-store] DEL", { key });

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", key);

      if (error) {
        throw new Error(`ePDS state store del failed: ${error.message}`);
      }
    },
  };
}
