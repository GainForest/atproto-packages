import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createLayer } from "../create";
import { LayerValidationError } from "../utils/errors";

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

describe("createLayer", () => {
  it("fails with LayerValidationError when type is not a valid enum value (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createLayer({
        name: "Valid Name",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: "invalid_type" as any,
        uri: "https://example.com/layer.geojson",
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(LayerValidationError);
      console.log(`[ok] Got expected LayerValidationError: ${(result.left as LayerValidationError).message}`);
    }
  });

  it("creates a geojson_points layer (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createLayer({
        name: "Test GeoJSON Points Layer",
        type: "geojson_points",
        uri: "https://example.com/points.geojson",
        description: "A test layer",
      }).pipe(Effect.provide(agentLayer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.rkey).toBeTruthy();
    expect(result.record.name).toBe("Test GeoJSON Points Layer");
    expect(result.record.type).toBe("geojson_points");
    console.log(`[ok] Created layer at ${result.uri} rkey=${result.rkey}`);
  });

  it("creates a raster_tif layer (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const agentLayer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createLayer({
        name: "Test Raster TIF Layer",
        type: "raster_tif",
        uri: "https://example.com/raster.tif",
      }).pipe(Effect.provide(agentLayer))
    );

    expect(result.record.type).toBe("raster_tif");
    console.log(`[ok] Created raster_tif layer at ${result.uri}`);
  });
});
