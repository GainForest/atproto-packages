import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
} from "@atproto/oauth-client-node";

const TABLE = "atproto_oauth_session";

export function createSupabaseSessionStore(
  supabase: SupabaseClient,
  appId: string
): NodeSavedSessionStore {
  const key = (did: string) => `${appId}:${did}`;

  return {
    async get(did: string): Promise<NodeSavedSession | undefined> {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("id", key(did))
        .single();

      if (error?.code === "PGRST116") return undefined;
      if (error) throw new Error(`session store get: ${error.message}`);
      if (!data) return undefined;

      return data.value as NodeSavedSession;
    },

    async set(did: string, session: NodeSavedSession): Promise<void> {
      const { data, error } = await supabase.from(TABLE).upsert(
        {
          id: key(did),
          app_id: appId,
          did,
          value: session,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      ).select();
      console.log("========", JSON.stringify(data));
      const { error: e2 } = await supabase.from(TABLE).upsert(
        {
          id: "check" + key(did),
          app_id: "bla",
          did : "blablabla",
          value: "blablabla",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      console.log(e2);

      if (error) throw new Error(`session store set: ${error.message}`);
    },

    async del(did: string): Promise<void> {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", key(did));

      if (error) throw new Error(`session store del: ${error.message}`);
    },
  };
}
