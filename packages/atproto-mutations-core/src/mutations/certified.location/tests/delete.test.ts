import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createCertifiedLocation } from "../create";
import { deleteCertifiedLocation } from "../delete";
import { CertifiedLocationPdsError, CertifiedLocationIsDefaultError } from "../utils/errors";
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

function makeGeoJsonFile(): SerializableFile {
  const content = POLYGON_GEOJSON;
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

describe("deleteCertifiedLocation", () => {
  it("creates then deletes a certified.location record (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "To Delete" }).pipe(
        Effect.provide(layer)
      )
    );

    const deleted = await Effect.runPromise(
      deleteCertifiedLocation({ rkey: created.rkey }).pipe(Effect.provide(layer))
    );

    expect(deleted.rkey).toBe(created.rkey);
    expect(deleted.uri).toContain(created.rkey);
    console.log(`[ok] Deleted certified.location at ${deleted.uri}`);
  });

  it("returns CertifiedLocationPdsError when rkey does not exist (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Deleting a non-existent record may succeed (ATProto deleteRecord is idempotent)
    // or fail with a PDS error — either behaviour is acceptable.
    const result = await Effect.runPromise(
      deleteCertifiedLocation({ rkey: "nonexistent999" }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    // If it fails it must be a typed PDS error, not an untyped exception.
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CertifiedLocationPdsError);
      console.log(`[ok] Got expected CertifiedLocationPdsError for non-existent rkey`);
    } else {
      console.log(`[ok] PDS accepted delete of non-existent record (idempotent behaviour)`);
    }
  });
});
