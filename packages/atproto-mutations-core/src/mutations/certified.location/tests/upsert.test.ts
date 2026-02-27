import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { upsertCertifiedLocation } from "../upsert";
import type { SerializableFile } from "../../../blob/types";

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
// Helpers
// ---------------------------------------------------------------------------

const POLYGON_GEOJSON = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.935242, 40.730610],
            [-73.935242, 40.740610],
            [-73.925242, 40.740610],
            [-73.925242, 40.730610],
            [-73.935242, 40.730610],
          ],
        ],
      },
      properties: {},
    },
  ],
});

function makeGeoJsonFile(overrides?: { content?: string }): SerializableFile {
  const content = overrides?.content ?? POLYGON_GEOJSON;
  return {
    $file: true,
    name: "test.geojson",
    type: "application/geo+json",
    size: content.length,
    data: btoa(content),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertCertifiedLocation", () => {
  it("creates a new record when no rkey is given (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      upsertCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Upsert Create" }).pipe(
        Effect.provide(layer)
      )
    );

    expect(result.created).toBe(true);
    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.rkey).toBeTruthy();
    console.log(`[ok] Upsert created new record at ${result.uri} (created=${result.created})`);
  });

  it("creates-or-updates idempotently when rkey is given (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // First upsert — may create or update.
    const first = await Effect.runPromise(
      upsertCertifiedLocation({
        shapefile: makeGeoJsonFile(),
        name: "Upsert Idempotent",
        rkey: "test-upsert-rkey",
      }).pipe(Effect.provide(layer))
    );

    // Second upsert — always an update (record now exists).
    const second = await Effect.runPromise(
      upsertCertifiedLocation({
        shapefile: makeGeoJsonFile(),
        name: "Upsert Idempotent v2",
        rkey: "test-upsert-rkey",
      }).pipe(Effect.provide(layer))
    );

    expect(second.created).toBe(false);
    expect(second.record.createdAt).toBe(first.record.createdAt);
    expect(second.record.name).toBe("Upsert Idempotent v2");
    console.log(`[ok] first.created=${first.created}, second.created=${second.created}, createdAt preserved`);
  });

  it("preserves createdAt across upserts (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const first = await Effect.runPromise(
      upsertCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "CreatedAt Test" }).pipe(
        Effect.provide(layer)
      )
    );

    const second = await Effect.runPromise(
      upsertCertifiedLocation({
        shapefile: makeGeoJsonFile(),
        name: "CreatedAt Test v2",
        rkey: first.rkey,
      }).pipe(Effect.provide(layer))
    );

    expect(first.record.createdAt).toBe(second.record.createdAt);
    console.log(`[ok] createdAt stable across upserts: ${second.record.createdAt}`);
  });
});
