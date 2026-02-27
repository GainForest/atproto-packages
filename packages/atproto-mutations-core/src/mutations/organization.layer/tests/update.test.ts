import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createLayer } from "../create";
import { updateLayer } from "../update";
import { LayerNotFoundError } from "../utils/errors";

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

describe("updateLayer", () => {
  it("fails with LayerNotFoundError when rkey does not exist (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      updateLayer({
        rkey: "nonexistent999",
        data: { name: "Updated Name" },
      }).pipe(Effect.either, Effect.provide(agentLayer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(LayerNotFoundError);
      console.log(`[ok] Got expected LayerNotFoundError for rkey: ${(result.left as LayerNotFoundError).rkey}`);
    }
  });

  it("updates name and description of an existing layer (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createLayer({
        name: "Layer Before Update",
        type: "choropleth",
        uri: "https://example.com/choropleth.geojson",
      }).pipe(Effect.provide(agentLayer))
    );

    const updated = await Effect.runPromise(
      updateLayer({
        rkey: created.rkey,
        data: { name: "Layer After Update", description: "A choropleth" },
      }).pipe(Effect.provide(agentLayer))
    );

    expect(updated.record.name).toBe("Layer After Update");
    expect(updated.record.description).toBe("A choropleth");
    expect(updated.record.type).toBe("choropleth");
    expect(updated.record.createdAt).toBe(created.record.createdAt);
    console.log(`[ok] Updated layer at ${updated.uri}`);
  });

  it("unsets description when listed in unset array (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createLayer({
        name: "Layer With Description",
        type: "tms_tile",
        uri: "https://example.com/tiles/{z}/{x}/{y}.png",
        description: "Tile server",
      }).pipe(Effect.provide(agentLayer))
    );

    const updated = await Effect.runPromise(
      updateLayer({
        rkey: created.rkey,
        data: {},
        unset: ["description"],
      }).pipe(Effect.provide(agentLayer))
    );

    expect(updated.record.description).toBeUndefined();
    console.log(`[ok] description successfully unset`);
  });
});
