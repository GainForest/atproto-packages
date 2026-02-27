import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { createAudioRecording } from "../create";
import { FileConstraintError } from "../../../blob/errors";
import type { SerializableFile } from "../../../blob/types";
import type { CreateAudioRecordingInput } from "../utils/types";

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

/**
 * Build a tiny valid WAV file (PCM, 44100 Hz, 1 channel, 1 sample).
 * WAV header: 44 bytes + 2 bytes of sample data = 46 bytes.
 */
function makeTinyWav(overrides?: { size?: number; type?: string }): SerializableFile {
  // Minimal 44-byte WAV header with 1 sample of silence
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  // RIFF header
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 38, true);              // chunk size
  bytes.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  // fmt sub-chunk
  bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);             // sub-chunk size
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // 1 channel
  view.setUint32(24, 44100, true);          // sample rate
  view.setUint32(28, 88200, true);          // byte rate
  view.setUint16(32, 2, true);              // block align
  view.setUint16(34, 16, true);             // bits per sample
  // data sub-chunk
  bytes.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, 2, true);              // data size
  // one silent sample (2 bytes)
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

const minimalMetadata = {
  codec: "PCM",
  channels: 1,
  duration: "0.00002",
  sampleRate: 44100,
  recordedAt: "2024-06-15T10:30:00.000Z",
};

const minimalInput: CreateAudioRecordingInput = {
  name: "Test Recording",
  audioFile: makeTinyWav(),
  metadata: minimalMetadata,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createAudioRecording", () => {
  it("fails with FileConstraintError when MIME type is not audio (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createAudioRecording({
        ...minimalInput,
        audioFile: makeTinyWav({ type: "video/mp4" }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("not accepted");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("fails with FileConstraintError when file exceeds 100 MB (offline)", async () => {
    const layer = makeCredentialAgentLayer({
      service: service || "https://bsky.social",
      identifier: identifier || "placeholder",
      password: password || "placeholder",
    });

    const result = await Effect.runPromise(
      createAudioRecording({
        ...minimalInput,
        audioFile: makeTinyWav({ size: 100 * 1024 * 1024 + 1 }),
      }).pipe(Effect.either, Effect.provide(layer))
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(FileConstraintError);
      expect((result.left as FileConstraintError).reason).toContain("exceeds maximum");
      console.log(`[ok] Got expected FileConstraintError: ${(result.left as FileConstraintError).reason}`);
    }
  });

  it("creates an audio recording record (integration — requires credentials)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Copy tests/.env.test-credentials.example → tests/.env.test-credentials");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createAudioRecording(minimalInput).pipe(Effect.provide(layer))
    );

    expect(result.uri).toMatch(/^at:\/\//);
    expect(result.rkey).toBeTruthy();
    expect(result.record.name).toBe("Test Recording");
    expect(result.record.metadata.codec).toBe("PCM");
    expect(result.record.metadata.channels).toBe(1);
    expect(result.record.metadata.sampleRate).toBe(44100);
    console.log(`[ok] Created audio recording at ${result.uri} rkey=${result.rkey}`);
  });

  it("creates an audio recording with description and coordinates (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      createAudioRecording({
        name: "Rainforest Bird Call",
        description: { text: "A dawn chorus recording from the Amazon." },
        audioFile: makeTinyWav(),
        metadata: {
          ...minimalMetadata,
          coordinates: "-3.4653,-62.2159",
        },
      }).pipe(Effect.provide(layer))
    );

    expect(result.record.metadata.coordinates).toBe("-3.4653,-62.2159");
    expect(result.record.description?.text).toBe("A dawn chorus recording from the Amazon.");
    console.log(`[ok] Created recording with description + coordinates at ${result.uri}`);
  });
});
