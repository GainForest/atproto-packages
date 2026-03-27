import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/ac/audio.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import { fromSerializableFile } from "../../blob/types";
import { fetchRecord, createRecord, putRecord } from "../../utils/shared";
import {
  AudioRecordingValidationError,
  AudioRecordingPdsError,
} from "./utils/errors";
import type {
  UpsertAudioRecordingInput,
  AudioRecordingMutationResult,
  AudioRecordingRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.ac.audio";
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

const ACCEPTED_AUDIO_MIMES = new Set([
  "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/mp4",
  "audio/x-m4a", "audio/aac", "audio/flac", "audio/x-flac",
  "audio/ogg", "audio/opus", "audio/webm", "audio/aiff", "audio/x-aiff",
]);

const makePdsError = (message: string, cause: unknown) =>
  new AudioRecordingPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new AudioRecordingValidationError({ message, cause });

/**
 * Upsert an audio recording record.
 *
 * - When `rkey` is omitted: always creates a new record.
 * - When `rkey` is provided: updates if found, creates (at that rkey) if not found.
 *
 * Always uploads the provided `audioFile` — unlike update, upsert requires the
 * full set of metadata on every call.
 */
export const upsertAudioRecording = (
  input: UpsertAudioRecordingInput
): Effect.Effect<
  AudioRecordingMutationResult & { created: boolean },
  | AudioRecordingValidationError
  | AudioRecordingPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { audioFile, name, description, metadata, rkey } = input;

    // 1. Validate file.
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return yield* Effect.fail(
        new FileConstraintError({
          path: ["audioFile"],
          reason: `Audio file size ${audioFile.size} B exceeds maximum ${MAX_AUDIO_BYTES} B (100 MB)`,
        })
      );
    }
    if (!ACCEPTED_AUDIO_MIMES.has(audioFile.type)) {
      return yield* Effect.fail(
        new FileConstraintError({
          path: ["audioFile"],
          reason: `MIME type "${audioFile.type}" is not accepted for audio recordings`,
        })
      );
    }

    // 2. Check for existing record (only when rkey given).
    let existing: AudioRecordingRecord | null = null;
    if (rkey) {
      existing = yield* fetchRecord<AudioRecordingRecord, AudioRecordingPdsError>(
        COLLECTION, rkey, makePdsError
      );
    }

    // 3. Upload the audio blob.
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(audioFile);
    const uploadResult = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: audioFile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause }),
    });
    const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
    const blobRef = { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size };

    // 4. Build the record.
    const createdAt = existing !== null ? existing.createdAt : new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      name,
      description: description
        ? {
            $type: "app.gainforest.common.defs#richtext",
            text: description.text,
            facets: description.facets,
          }
        : undefined,
      blob: {
        $type: "app.gainforest.common.defs#audio",
        file: blobRef,
      },
      metadata: {
        $type: "app.gainforest.ac.audio#metadata",
        codec: metadata.codec,
        channels: metadata.channels,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        recordedAt: metadata.recordedAt,
      },
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => makeValidationError(`ac.audio record failed lexicon validation: ${String(cause)}`, cause),
    });

    // 5. Write.
    const isCreate = !rkey || existing === null;
    let resultUri: string;
    let cid: string;
    let assignedRkey: string;

    if (isCreate) {
      const result = yield* createRecord(COLLECTION, record, rkey, makePdsError);
      resultUri = result.uri;
      cid = result.cid;
      assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";
    } else {
      const result = yield* putRecord(COLLECTION, rkey!, record, makePdsError);
      resultUri = result.uri;
      cid = result.cid;
      assignedRkey = rkey!;
    }

    return {
      uri: resultUri,
      cid,
      rkey: assignedRkey,
      record: record as AudioRecordingRecord,
      created: isCreate,
    };
  });

export { AudioRecordingValidationError, AudioRecordingPdsError, FileConstraintError, BlobUploadError };
