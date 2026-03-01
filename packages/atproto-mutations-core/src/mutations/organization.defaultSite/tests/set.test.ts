import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { setDefaultSite } from "../set";
import {
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
} from "../utils/errors";
import { createCertifiedLocation } from "../../certified.location/create";
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
  return {
    $file: true,
    name: "test.geojson",
    type: "application/geo+json",
    size: POLYGON_GEOJSON.length,
    data: btoa(POLYGON_GEOJSON),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("setDefaultSite", () => {
  it("fails with DefaultSiteValidationError when URI does not contain certified.location (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      setDefaultSite({ locationUri: "at://did:plc:abc123/app.gainforest.organization.info/self" }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DefaultSiteValidationError);
      console.log(`[ok] Got expected DefaultSiteValidationError: ${(result.left as DefaultSiteValidationError).message}`);
    }
  });

  it("fails with DefaultSiteValidationError when DID in URI does not match user's DID (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Use a URI with a different DID
    const result = await Effect.runPromise(
      setDefaultSite({
        locationUri: "at://did:plc:someotherdid999/app.certified.location/someRkey",
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DefaultSiteValidationError);
      expect((result.left as DefaultSiteValidationError).message).toContain("does not match authenticated DID");
      console.log(`[ok] Got expected DefaultSiteValidationError (DID mismatch)`);
    }
  });

  it("fails with DefaultSiteLocationNotFoundError when location does not exist (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Get the user's DID first by creating a layer and inspecting the agent.
    // We need the DID to construct a valid-format URI that fails on existence.
    let myDid = "";
    try {
      const { Agent, CredentialSession } = await import("@atproto/api");
      const session = new CredentialSession(new URL(service));
      await session.login({ identifier, password });
      myDid = session.did ?? "";
    } catch {
      console.log("[skip] Could not determine DID.");
      return;
    }

    if (!myDid) {
      console.log("[skip] DID not available.");
      return;
    }

    const result = await Effect.runPromise(
      setDefaultSite({
        locationUri: `at://${myDid}/app.certified.location/nonexistent999`,
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DefaultSiteLocationNotFoundError);
      console.log(`[ok] Got expected DefaultSiteLocationNotFoundError`);
    }
  });

  it("sets the default site to an existing certified.location (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // Create a location first.
    const location = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Default Site Location" }).pipe(
        Effect.provide(layer)
      )
    );

    // Set it as the default.
    const result = await Effect.runPromise(
      setDefaultSite({ locationUri: location.uri }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    // Cast to string for comparison since site is a branded AtUriString
    expect(result.record.site as string).toBe(location.uri as string);
    console.log(`[ok] Set default site to ${location.uri}, record at ${result.uri}`);
  });

  // 4 PDS round-trips (2× create + 2× setDefaultSite) — needs generous timeout
  it("can update the default site by calling set again (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const loc1 = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Default Site 1" }).pipe(
        Effect.provide(layer)
      )
    );

    const loc2 = await Effect.runPromise(
      createCertifiedLocation({ shapefile: makeGeoJsonFile(), name: "Default Site 2" }).pipe(
        Effect.provide(layer)
      )
    );

    await Effect.runPromise(
      setDefaultSite({ locationUri: loc1.uri }).pipe(Effect.provide(layer))
    );

    const updated = await Effect.runPromise(
      setDefaultSite({ locationUri: loc2.uri }).pipe(Effect.provide(layer))
    );

    // Cast to string for comparison since site is a branded AtUriString
    expect(updated.record.site as string).toBe(loc2.uri as string);
    console.log(`[ok] Default site updated from ${loc1.uri} to ${loc2.uri}`);
  }, 15000);
});
