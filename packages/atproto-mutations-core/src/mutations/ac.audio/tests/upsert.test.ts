import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { upsertAudioRecording } from "../upsert";
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

function makeTinyWav(): SerializableFile {
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
  return { $file: true, name: "test.wav", type: "audio/wav", size: bytes.length, data: btoa(binary) };
}

const baseMetadata = {
  codec: "PCM", channels: 1, duration: "0.00002", sampleRate: 44100,
  recordedAt: "2024-06-15T10:30:00.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertAudioRecording", () => {
  it("creates a new recording when no rkey is given (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      upsertAudioRecording({
        name: "Upsert Created Recording",
        audioFile: makeTinyWav(),
        metadata: baseMetadata,
      }).pipe(Effect.provide(layer))
    );

    expect(result.created).toBe(true);
    expect(result.uri).toMatch(/^at:\/\//);
    console.log(`[ok] Upsert created new recording at ${result.uri} (created=${result.created})`);
  });

  it("creates-or-updates idempotently with rkey (integration)", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const first = await Effect.runPromise(
      upsertAudioRecording({
        name: "Upsert Recording v1",
        audioFile: makeTinyWav(),
        metadata: baseMetadata,
        rkey: "test-audio-upsert",
      }).pipe(Effect.provide(layer))
    );

    const second = await Effect.runPromise(
      upsertAudioRecording({
        name: "Upsert Recording v2",
        audioFile: makeTinyWav(),
        metadata: baseMetadata,
        rkey: "test-audio-upsert",
      }).pipe(Effect.provide(layer))
    );

    expect(second.created).toBe(false);
    expect(second.record.name).toBe("Upsert Recording v2");
    expect(second.record.createdAt).toBe(first.record.createdAt);
    console.log(`[ok] first.created=${first.created}, second.created=${second.created}, createdAt preserved`);
  });
});
