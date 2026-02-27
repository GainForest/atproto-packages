import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createLayer } from "../create";
import { deleteLayer } from "../delete";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

const ENV_PATH = new URL("../../../../tests/.env.test-credentials", import.meta.url);
const loaded = await (async () => {
  try {
    const t = await Bun.file(ENV_PATH.pathname).text();
    return Object.fromEntries(
      t.split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => l.split("=").map((s) => s.trim()) as [string, string])
    );
  } catch {
    return {} as Record<string, string>;
  }
})();

const service    = loaded["ATPROTO_SERVICE"]    ?? process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = loaded["ATPROTO_IDENTIFIER"] ?? process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = loaded["ATPROTO_PASSWORD"]   ?? process.env["ATPROTO_PASSWORD"]   ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteLayer", () => {
  it("creates then deletes a layer (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createLayer({
        name: "Layer To Delete",
        type: "geojson_points_trees",
        uri: "https://example.com/trees.geojson",
      }).pipe(Effect.provide(agentLayer))
    );

    const deleted = await Effect.runPromise(
      deleteLayer({ rkey: created.rkey }).pipe(Effect.provide(agentLayer))
    );

    expect(deleted.rkey).toBe(created.rkey);
    expect(deleted.uri).toContain(created.rkey);
    console.log(`[ok] Deleted layer at ${deleted.uri}`);
  });
});
