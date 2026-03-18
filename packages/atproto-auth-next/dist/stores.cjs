"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/stores.ts
var stores_exports = {};
__export(stores_exports, {
  cleanupExpiredStates: () => cleanupExpiredStates,
  createSupabaseSessionStore: () => createSupabaseSessionStore,
  createSupabaseStateStore: () => createSupabaseStateStore
});
module.exports = __toCommonJS(stores_exports);

// src/stores/session-store.ts
var TABLE = "atproto_oauth_session";
function createSupabaseSessionStore(supabase, appId) {
  const key = (did) => `${appId}:${did}`;
  return {
    async get(did) {
      const { data, error } = await supabase.from(TABLE).select("value").eq("id", key(did)).single();
      if (error?.code === "PGRST116") return void 0;
      if (error) throw new Error(`session store get: ${error.message}`);
      if (!data) return void 0;
      return data.value;
    },
    async set(did, session) {
      const { error } = await supabase.from(TABLE).upsert(
        {
          id: key(did),
          app_id: appId,
          did,
          value: session,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        { onConflict: "id" }
      ).select();
      if (error) throw new Error(`session store set: ${error.message}`);
    },
    async del(did) {
      const { error } = await supabase.from(TABLE).delete().eq("id", key(did));
      if (error) throw new Error(`session store del: ${error.message}`);
    }
  };
}

// src/stores/state-store.ts
var TABLE2 = "atproto_oauth_state";
var TTL_MS = 60 * 60 * 1e3;
function createSupabaseStateStore(supabase, appId) {
  const key = (k) => `${appId}:${k}`;
  return {
    async get(k) {
      const { data, error } = await supabase.from(TABLE2).select("value, expires_at").eq("id", key(k)).single();
      if (error?.code === "PGRST116") return void 0;
      if (error) throw new Error(`state store get: ${error.message}`);
      if (!data) return void 0;
      if (new Date(data.expires_at) < /* @__PURE__ */ new Date()) {
        await supabase.from(TABLE2).delete().eq("id", key(k));
        throw new Error("OAuth state expired");
      }
      return data.value;
    },
    async set(k, state) {
      const { error } = await supabase.from(TABLE2).upsert(
        {
          id: key(k),
          app_id: appId,
          value: state,
          expires_at: new Date(Date.now() + TTL_MS).toISOString()
        },
        { onConflict: "id" }
      );
      if (error) throw new Error(`state store set: ${error.message}`);
    },
    async del(k) {
      const { error } = await supabase.from(TABLE2).delete().eq("id", key(k));
      if (error) throw new Error(`state store del: ${error.message}`);
    }
  };
}
async function cleanupExpiredStates(supabase) {
  const { data, error } = await supabase.from(TABLE2).delete().lt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).select("id");
  if (error) throw new Error(`state store cleanup: ${error.message}`);
  return data?.length ?? 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cleanupExpiredStates,
  createSupabaseSessionStore,
  createSupabaseStateStore
});
//# sourceMappingURL=stores.cjs.map