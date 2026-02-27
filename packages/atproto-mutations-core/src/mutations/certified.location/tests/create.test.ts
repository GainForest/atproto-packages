import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createCertifiedLocation } from "../create";
import {
  CertifiedLocationValidationError,
  CertifiedLocationPdsError,
} from "../utils/errors";
import { GeoJsonValidationError, GeoJsonProcessingError } from "../../../geojson/errors";
import type { SerializableFile } from "../../../blob/types";
import type { CreateCertifiedLocationInput } from "../utils/types";

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

/** Minimal valid GeoJSON FeatureCollection with a polygon. */
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

function makeGeoJsonFile(overrides?: {
  content?: string;
  type?: string;
  size?: number;
}): SerializableFile {
  const content = overrides?.content ?? POLYGON_GEOJSON;
  const data = btoa(content);
  return {
    $file: true,
    name: "test.geojson",
    type: overrides?.type ?? "application/geo+json",
    size: overrides?.size ?? content.length,
    data,
  };
}

const minimalInput: CreateCertifiedLocationInput = {
  shapefile: makeGeoJsonFile(),
  name: "Test Location",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createCertifiedLocation", () => {
  it("fails with GeoJsonValidationError when MIME type is not geo+json (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createCertifiedLocation({
        ...minimalInput,
        shapefile: makeGeoJsonFile({ type: "text/plain" }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(GeoJsonValidationError);
      expect((result.left as GeoJsonValidationError).message).toContain("application/geo+json");
      console.log(`[ok] Got expected GeoJsonValidationError: ${(result.left as GeoJsonValidationError).message}`);
    }
  });

  it("fails with GeoJsonValidationError when file exceeds 10 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createCertifiedLocation({
        ...minimalInput,
        shapefile: makeGeoJsonFile({ size: 10 * 1024 * 1024 + 1 }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(GeoJsonValidationError);
      expect((result.left as GeoJsonValidationError).message).toContain("exceeds maximum");
      console.log(`[ok] Got expected GeoJsonValidationError: ${(result.left as GeoJsonValidationError).message}`);
    }
  });

  it("fails with GeoJsonValidationError when GeoJSON structure is invalid (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createCertifiedLocation({
        ...minimalInput,
        shapefile: makeGeoJsonFile({ content: JSON.stringify({ type: "notAType" }) }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(GeoJsonValidationError);
      console.log(`[ok] Got expected GeoJsonValidationError: ${(result.left as GeoJsonValidationError).message}`);
    }
  });

  it("fails with GeoJsonProcessingError when GeoJSON has no polygon geometry (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    // A valid GeoJSON with only a point — no polygon, no area
    const pointGeoJson = JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.935242, 40.730610] },
      properties: {},
    });

    const result = await Effect.runPromise(
      createCertifiedLocation({
        ...minimalInput,
        shapefile: makeGeoJsonFile({ content: pointGeoJson }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(GeoJsonProcessingError);
      console.log(`[ok] Got expected GeoJsonProcessingError: ${(result.left as GeoJsonProcessingError).message}`);
    }
  });

  it("creates a certified.location record (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createCertifiedLocation(minimalInput).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.rkey).toBeTruthy();
    expect(result.record.lpVersion).toBe("1.0.0");
    expect(result.record.locationType).toBe("geojson-point");
    expect(result.record.name).toBe("Test Location");
    console.log(`[ok] Created certified.location at ${result.uri} rkey=${result.rkey}`);
  });
});
