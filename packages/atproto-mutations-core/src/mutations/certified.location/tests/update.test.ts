import { describe, it, expect } from "bun:test";
import type { Agent } from "@atproto/api";
import { CID } from "@atproto/lex-data";
import { Effect, Layer } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { AtprotoAgent } from "../../../services/AtprotoAgent";
import { createCertifiedLocation } from "../create";
import { updateCertifiedLocation } from "../update";
import {
  CertifiedLocationLinkedTreesConflictError,
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

const FAKE_DID = "did:plc:testlocationupdate";
const FAKE_SITE_RKEY = "site-1";
const FAKE_SITE_URI = `at://${FAKE_DID}/app.certified.location/${FAKE_SITE_RKEY}`;
const OTHER_FAKE_SITE_URI = `at://${FAKE_DID}/app.certified.location/site-2`;
const FAKE_BLOB_CID = CID.parse("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");

type FakeOccurrenceRecord = {
  uri: string;
  cid: string;
  value: Record<string, unknown>;
};

type FakeBoundaryAgentOptions = {
  records?: FakeOccurrenceRecord[];
  allowWrites?: boolean;
};

function makeFakeExistingLocationRecord() {
  return {
    $type: "app.certified.location",
    lpVersion: "1.0.0",
    srs: "https://epsg.io/4326",
    locationType: "coordinate-decimal",
    location: {
      $type: "app.certified.location#string",
      string: "0,0",
    },
    name: "Existing site",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeFakeOccurrenceRecord(
  rkey: string,
  overrides?: Record<string, unknown>,
): FakeOccurrenceRecord {
  return {
    uri: `at://${FAKE_DID}/app.gainforest.dwc.occurrence/${rkey}`,
    cid: `${rkey}-cid`,
    value: {
      $type: "app.gainforest.dwc.occurrence",
      scientificName: "Linked tree",
      eventDate: "2026-01-01",
      decimalLatitude: "0",
      decimalLongitude: "0",
      siteRef: FAKE_SITE_URI,
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    },
  };
}

function makeFakeBoundaryAgent(options?: FakeBoundaryAgentOptions): Agent {
  const records = options?.records ?? [
    makeFakeOccurrenceRecord("tree-1", { scientificName: "Excluded tree" }),
  ];
  const fakeAgent = {
    assertDid: FAKE_DID,
    com: {
      atproto: {
        repo: {
          getRecord: async () => ({
            data: {
              value: makeFakeExistingLocationRecord(),
            },
          }),
          listRecords: async () => ({
            data: {
              records,
              cursor: undefined,
            },
          }),
          putRecord: async () => {
            if (!options?.allowWrites) {
              throw new Error("putRecord should not run when linked trees are outside the boundary");
            }

            return {
              data: {
                uri: FAKE_SITE_URI,
                cid: "updated-site-cid",
              },
            };
          },
        },
      },
    },
    uploadBlob: async () => {
      if (!options?.allowWrites) {
        throw new Error("uploadBlob should not run when linked trees are outside the boundary");
      }

      return {
        data: {
          blob: {
            ref: FAKE_BLOB_CID,
            mimeType: "application/geo+json",
            size: 123,
          },
        },
      };
    },
  };

  return fakeAgent as unknown as Agent;
}

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
    const layer = Layer.succeed(AtprotoAgent, makeFakeBoundaryAgent());

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

  it("blocks shapefile updates that would exclude linked trees (offline)", async () => {
    const layer = Layer.succeed(AtprotoAgent, makeFakeBoundaryAgent());

    const result = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: FAKE_SITE_RKEY,
        data: { name: "Boundary update" },
        newShapefile: makeGeoJsonFile(),
      }).pipe(Effect.either, Effect.provide(layer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CertifiedLocationLinkedTreesConflictError);
      expect(result.left.message).toContain("linked tree");
    }
  });

  it("blocks shapefile updates when linked tree coordinates are missing or malformed (offline)", async () => {
    const scenarios = [
      {
        name: "blank latitude",
        record: makeFakeOccurrenceRecord("blank-latitude", {
          decimalLatitude: "",
          decimalLongitude: "40.735610",
        }),
      },
      {
        name: "whitespace latitude",
        record: makeFakeOccurrenceRecord("whitespace-latitude", {
          decimalLatitude: "   ",
          decimalLongitude: "40.735610",
        }),
      },
      {
        name: "partial numeric latitude",
        record: makeFakeOccurrenceRecord("partial-latitude", {
          decimalLatitude: "40.735610abc",
          decimalLongitude: "-73.930242",
        }),
      },
      {
        name: "non-finite latitude",
        record: makeFakeOccurrenceRecord("infinite-latitude", {
          decimalLatitude: "Infinity",
          decimalLongitude: "-73.930242",
        }),
      },
      {
        name: "out-of-range longitude",
        record: makeFakeOccurrenceRecord("bad-longitude", {
          decimalLatitude: "40.735610",
          decimalLongitude: "181",
        }),
      },
    ];

    for (const scenario of scenarios) {
      const layer = Layer.succeed(
        AtprotoAgent,
        makeFakeBoundaryAgent({ records: [scenario.record] }),
      );

      const result = await Effect.runPromise(
        updateCertifiedLocation({
          rkey: FAKE_SITE_RKEY,
          data: { name: `Boundary update ${scenario.name}` },
          newShapefile: makeGeoJsonFile(),
        }).pipe(Effect.either, Effect.provide(layer)),
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(CertifiedLocationLinkedTreesConflictError);
        expect(result.left.message).toContain("could not be checked");
      }
    }
  });

  it("blocks shapefile updates that would move linked trees near the boundary (offline)", async () => {
    const layer = Layer.succeed(
      AtprotoAgent,
      makeFakeBoundaryAgent({
        records: [
          makeFakeOccurrenceRecord("near-boundary", {
            scientificName: "Near tree",
            decimalLatitude: "40.735610",
            decimalLongitude: "-73.92520",
          }),
        ],
      }),
    );

    const result = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: FAKE_SITE_RKEY,
        data: { name: "Boundary update" },
        newShapefile: makeGeoJsonFile(),
      }).pipe(Effect.either, Effect.provide(layer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CertifiedLocationLinkedTreesConflictError);
      expect(result.left.message).toContain("near boundary");
    }
  });

  it("ignores legacy and differently linked trees while allowing inside linked trees (offline)", async () => {
    const layer = Layer.succeed(
      AtprotoAgent,
      makeFakeBoundaryAgent({
        allowWrites: true,
        records: [
          makeFakeOccurrenceRecord("inside", {
            scientificName: "Inside tree",
            decimalLatitude: "40.735610",
            decimalLongitude: "-73.930242",
          }),
          makeFakeOccurrenceRecord("legacy", {
            scientificName: "Legacy tree",
            siteRef: undefined,
          }),
          makeFakeOccurrenceRecord("different-site", {
            scientificName: "Different site tree",
            siteRef: OTHER_FAKE_SITE_URI,
          }),
        ],
      }),
    );

    const result = await Effect.runPromise(
      updateCertifiedLocation({
        rkey: FAKE_SITE_RKEY,
        data: { name: "Boundary update" },
        newShapefile: makeGeoJsonFile(),
      }).pipe(Effect.either, Effect.provide(layer)),
    );

    expect(result._tag).toBe("Right");
    if (result._tag === "Right") {
      expect(result.right.rkey).toBe(FAKE_SITE_RKEY);
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
