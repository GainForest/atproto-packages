import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { upsertOrganizationInfo } from "../upsert";
import { FileConstraintError } from "../../../blob/errors";
import type { CreateOrganizationInfoInput } from "../utils/types";
import type { SerializableFile } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

await Bun.file(new URL("../../../../tests/.env.test-credentials", import.meta.url))
  .text()
  .then((text) => {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  })
  .catch(() => {});

const service    = process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = process.env["ATPROTO_PASSWORD"]   ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTinyPng(overrides?: { size?: number; type?: string }): SerializableFile {
  const PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return {
    $file: true,
    name: "test.png",
    type: overrides?.type ?? "image/png",
    size: overrides?.size ?? 67,
    data: PNG_BASE64,
  };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const fullInput: CreateOrganizationInfoInput = {
  displayName: "Test Org (atproto-mutations-core)",
  shortDescription: {
    $type: "app.gainforest.common.defs#richtext",
    text: "A test organization created by the automated test suite.",
  },
  longDescription: {
    $type: "pub.leaflet.pages.linearDocument",
    blocks: [],
  },
  objectives: ["Conservation"],
  country: "BR",
  visibility: "Unlisted",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertOrganizationInfo", () => {
  it("creates or fully replaces the record idempotently", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials " +
        "and fill in your credentials to run this test."
      );
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // First call — creates if not present, replaces if present.
    const first = await Effect.runPromise(
      upsertOrganizationInfo(fullInput).pipe(Effect.provide(layer))
    );

    expect(first.uri).toMatch(/^at:\/\//);
    expect(first.cid).toBeString();
    expect(first.record.displayName).toBe(fullInput.displayName);
    expect(first.record.country).toBe("BR");
    console.log(
      `[ok] Upsert (first call) — created=${first.created}, uri=${first.uri}`
    );

    // Second call — always a replace (record now exists), with new data.
    const second = await Effect.runPromise(
      upsertOrganizationInfo({
        ...fullInput,
        displayName: "Test Org — Upserted Name!!",
      }).pipe(Effect.provide(layer))
    );

    expect(second.created).toBe(false);
    expect(second.record.displayName).toBe("Test Org — Upserted Name!!");
    // createdAt must be the same value set during the initial creation.
    expect(second.record.createdAt).toBe(first.record.createdAt);
    console.log(
      `[ok] Upsert (second call) — created=${second.created}, ` +
      `displayName=${second.record.displayName}, createdAt preserved=${second.record.createdAt}`
    );
  });

  it("reports created=true on first upsert and created=false on subsequent ones", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const results = await Effect.runPromise(
      Effect.gen(function* () {
        const a = yield* upsertOrganizationInfo(fullInput);
        const b = yield* upsertOrganizationInfo(fullInput);
        return { a, b };
      }).pipe(Effect.provide(layer))
    );

    // b is always false — record existed from a (or a prior test run).
    expect(results.b.created).toBe(false);
    console.log(
      `[ok] a.created=${results.a.created}, b.created=${results.b.created}`
    );
  });

  it("preserves createdAt across upserts", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const first = await Effect.runPromise(
      upsertOrganizationInfo(fullInput).pipe(Effect.provide(layer))
    );

    const second = await Effect.runPromise(
      upsertOrganizationInfo({ ...fullInput, displayName: "Test Org — CreatedAt Test!!!!" }).pipe(
        Effect.provide(layer)
      )
    );

    expect(first.record.createdAt).toBe(second.record.createdAt);
    console.log(`[ok] createdAt stable across upserts: ${second.record.createdAt}`);
  });

  it("fully replaces the record — fields absent from the new input are removed", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // First upsert: set a website.
    await Effect.runPromise(
      upsertOrganizationInfo({ ...fullInput, website: "https://example.com" }).pipe(
        Effect.provide(layer)
      )
    );

    // Second upsert: supply fullInput which has no website → it should be gone.
    const result = await Effect.runPromise(
      upsertOrganizationInfo(fullInput).pipe(Effect.provide(layer))
    );

    expect(result.record.website).toBeUndefined();
    console.log("[ok] website absent from second upsert input — field was removed from record");
  });

  it("fails with OrganizationInfoValidationError on invalid input", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    // "Bad" is too short for displayName (min 8 chars).
    const result = await Effect.runPromise(
      upsertOrganizationInfo({ ...fullInput, displayName: "Bad" }).pipe(
        Effect.either,
        Effect.provide(layer)
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("OrganizationInfoValidationError");
      console.log(
        `[ok] Got expected OrganizationInfoValidationError: ${result.left.message}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Blob tests
  // -------------------------------------------------------------------------

  it("fails with FileConstraintError when logo MIME type is invalid (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      upsertOrganizationInfo({
        ...fullInput,
        logo: {
          // TypeScript accepts this because WithFileInputs transforms BlobRef -> FileOrBlobRef,
          // but runtime validation will catch the invalid MIME type
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ type: "application/octet-stream" }),
        },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("not accepted");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("fails with FileConstraintError when coverImage exceeds 5 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      upsertOrganizationInfo({
        ...fullInput,
        coverImage: {
          // TypeScript accepts this because WithFileInputs transforms BlobRef -> FileOrBlobRef,
          // but runtime validation will catch the oversized file
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng({ size: 5 * 1024 * 1024 + 100 }),
        },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("exceeds maximum");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("upserts with a logo SerializableFile (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      upsertOrganizationInfo({
        ...fullInput,
        logo: {
          // WithFileInputs allows SerializableFile here (transformed from BlobRef)
          $type: "org.hypercerts.defs#smallImage",
          image: makeTinyPng(),
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.record.logo).toBeDefined();
    expect(result.record.logo?.image).toBeDefined();
    console.log(
      `[ok] Upserted organization.info with logo blob — created=${result.created}, uri=${result.uri}`
    );
  });
});
