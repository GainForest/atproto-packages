import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createCertifiedLocation } from "../create";
import { updateCertifiedLocation } from "../update";
import {
  CertifiedLocationNotFoundError,
} from "../utils/errors";
import { GeoJsonValidationError } from "../../../geojson/errors";
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

function makeGeoJsonFile(overrides?: { content?: string; type?: string; size?: number }): SerializableFile {
  const content = overrides?.content ?? POLYGON_GEOJSON;
  return {
    $file: true,
    name: "test.geojson",
    type: overrides?.type ?? "application/geo+json",
    size: overrides?.size ?? content.length,
    data: btoa(content),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateCertifiedLocation", () => {
  it("fails with CertifiedLocationNotFoundError when rkey does not exist (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: "nonexistent999",
        data: { name: "Updated" },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CertifiedLocationNotFoundError);
      console.log(`[ok] Got expected CertifiedLocationNotFoundError for rkey: ${(result.left as CertifiedLocationNotFoundError).rkey}`);
    }
  });

  it("fails with GeoJsonValidationError when new shapefile has wrong MIME (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: "somerk",
        data: {},
        newShapefile: makeGeoJsonFile({ type: "application/json" }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      // GeoJsonValidationError is raised before any PDS fetch
      expect(result.left).toBeInstanceOf(GeoJsonValidationError);
      console.log(`[ok] Got expected GeoJsonValidationError: ${(result.left as GeoJsonValidationError).message}`);
    }
  });

  it("updates name and description without replacing blob (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a record first.
    const created = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Before Update" }).pipe(
        Effect.provide(layer)
      )
    );

    const updated = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: created.rkey,
        data: { name: "After Update", description: "Added description" },
      }).pipe(Effect.provide(layer))
    );

    expect(updated.record.name).toBe("After Update");
    expect(updated.record.description).toBe("Added description");
    expect(updated.record.createdAt).toBe(created.record.createdAt);
    console.log(`[ok] Updated certified.location at ${updated.uri}`);
  });

  it("updates shapefile with new GeoJSON (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Shape Update Test" }).pipe(
        Effect.provide(layer)
      )
    );

    const UPDATED_GEOJSON = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-74.035242, 40.830610],
                [-74.035242, 40.840610],
                [-74.025242, 40.840610],
                [-74.025242, 40.830610],
                [-74.035242, 40.830610],
              ],
            ],
          },
          properties: {},
        },
      ],
    });

    const updated = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: created.rkey,
        data: { name: "After Shapefile Update" },
        newShapefile: makeGeoJsonFile({ content: UPDATED_GEOJSON }),
      }).pipe(Effect.provide(layer))
    );

    expect(updated.record.name).toBe("After Shapefile Update");
    expect(updated.uri).toMatch(/^at:\/\//);
    console.log(`[ok] Updated certified.location with new shapefile at ${updated.uri}`);
  });
});
