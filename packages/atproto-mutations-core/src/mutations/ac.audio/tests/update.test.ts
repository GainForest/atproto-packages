import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createAudioRecording } from "../create";
import { updateAudioRecording } from "../update";
import {
  AudioRecordingNotFoundError,
  AudioRecordingValidationError,
} from "../utils/errors";
import { FileConstraintError } from "../../../blob/errors";
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

function makeTinyWav(overrides?: { size?: number; type?: string }): SerializableFile {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  view.setUint32(4, 38, true);
  bytes.set([0x57, 0x41, 0x56, 0x45], 8);
  bytes.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 88200, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  bytes.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, 2, true);
  view.setInt16(44, 0, true);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return {
    $file: true,
    name: "test.wav",
    type: overrides?.type ?? "audio/wav",
    size: overrides?.size ?? bytes.length,
    data: btoa(binary),
  };
}

const baseMetadata = {
  codec: "PCM",
  channels: 1,
  duration: "0.00002",
  sampleRate: 44100,
  recordedAt: "2024-06-15T10:30:00.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateAudioRecording", () => {
  it("fails with AudioRecordingNotFoundError when rkey does not exist (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      updateAudioRecording({
        rkey: "nonexistent999",
        data: { name: "Updated" },
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(AudioRecordingNotFoundError);
      console.log(`[ok] Got expected AudioRecordingNotFoundError`);
    }
  });

  it("fails with AudioRecordingValidationError when newAudioFile given but no newTechnicalMetadata (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateAudioRecording({
        rkey: "somerk",
        data: {},
        newAudioFile: makeTinyWav(),
        // newTechnicalMetadata intentionally omitted
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(AudioRecordingValidationError);
      expect((result.left as AudioRecordingValidationError).message).toContain("newTechnicalMetadata");
      console.log(`[ok] Got expected AudioRecordingValidationError: ${(result.left as AudioRecordingValidationError).message}`);
    }
  });

  it("fails with FileConstraintError when newAudioFile has wrong MIME type (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      updateAudioRecording({
        rkey: "somerk",
        data: {},
        newAudioFile: makeTinyWav({ type: "image/png" }),
        newTechnicalMetadata: baseMetadata,
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("updates name without replacing the blob (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const created = await Effect.runPromise(
      createAudioRecording({
        name: "Before Update",
        audioFile: makeTinyWav(),
        metadata: baseMetadata,
      }).pipe(Effect.provide(layer))
    );

    const updated = await Effect.runPromise(
      updateAudioRecording({
        rkey: created.rkey,
        data: {
          name: "After Update",
        },
      }).pipe(Effect.provide(layer))
    );

    expect(updated.record.name).toBe("After Update");
    expect(updated.record.metadata.codec).toBe("PCM"); // preserved
    expect(updated.record.createdAt).toBe(created.record.createdAt);
    console.log(`[ok] Updated audio recording at ${updated.uri}`);
  });
});
