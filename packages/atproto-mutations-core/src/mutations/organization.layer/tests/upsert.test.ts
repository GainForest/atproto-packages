import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { upsertLayer } from "../upsert";

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

describe("upsertLayer", () => {
  it("creates a new layer when no rkey is given (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      upsertLayer({
        name: "Upsert Created Layer",
        type: "geojson_line",
        uri: "https://example.com/lines.geojson",
      }).pipe(Effect.provide(agentLayer))
    );

    expect(result.created).toBe(true);
    expect(result.uri).toMatch(/^at:\/\//);
    console.log(`[ok] Upsert created new layer at ${result.uri} (created=${result.created})`);
  });

  it("creates-or-updates idempotently with rkey (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const first = await Effect.runPromise(
      upsertLayer({
        name: "Upsert Layer v1",
        type: "choropleth_shannon",
        uri: "https://example.com/layer.geojson",
        rkey: "test-layer-upsert",
      }).pipe(Effect.provide(agentLayer))
    );

    const second = await Effect.runPromise(
      upsertLayer({
        name: "Upsert Layer v2",
        type: "choropleth_shannon",
        uri: "https://example.com/layer-v2.geojson",
        rkey: "test-layer-upsert",
      }).pipe(Effect.provide(agentLayer))
    );

    expect(second.created).toBe(false);
    expect(second.record.name).toBe("Upsert Layer v2");
    expect(second.record.createdAt).toBe(first.record.createdAt);
    console.log(`[ok] first.created=${first.created}, second.created=${second.created}`);
  });
});
