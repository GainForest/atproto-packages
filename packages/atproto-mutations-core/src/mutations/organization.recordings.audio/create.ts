import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import { fromSerializableFile } from "../../blob/types";
import { createRecord } from "../../utils/shared";
import {
  AudioRecordingValidationError,
  AudioRecordingPdsError,
} from "./utils/errors";
import type {
  CreateAudioRecordingInput,
  AudioRecordingMutationResult,
  AudioRecordingRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.organization.recordings.audio";
const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB

const ACCEPTED_AUDIO_MIMES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/aiff",
  "audio/x-aiff",
]);

const makePdsError = (message: string, cause: unknown) =>
  new AudioRecordingPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new AudioRecordingValidationError({ message, cause });

export const createAudioRecording = (
  input: CreateAudioRecordingInput
): Effect.Effect<
  AudioRecordingMutationResult,
  | AudioRecordingValidationError
  | AudioRecordingPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { audioFile, name, description, metadata, rkey } = input;

    // 1. Validate file size and MIME type.
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
          reason: `MIME type "${audioFile.type}" is not accepted for audio recordings; allowed: ${[...ACCEPTED_AUDIO_MIMES].join(", ")}`,
        })
      );
    }

    // 2. Upload the audio blob.
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(audioFile);
    const uploadResult = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: audioFile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause }),
    });
    // Use raw.mimeType from the PDS response — the PDS may normalize on upload (e.g.
    // "audio/wav" → "audio/vnd.wave"). The stored blobRef must use the normalized
    // mimeType so the PDS accepts the record write.
    const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
    const blobRef = { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size };

    // 3. Build and validate the record.
    const createdAt = new Date().toISOString();
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
        $type: "app.gainforest.organization.recordings.audio#metadata",
        codec: metadata.codec,
        channels: metadata.channels,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        recordedAt: metadata.recordedAt,
        coordinates: metadata.coordinates,
      },
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => makeValidationError(`organization.recordings.audio record failed lexicon validation: ${String(cause)}`, cause),
    });

    // 4. Write to PDS.
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as AudioRecordingRecord,
    } satisfies AudioRecordingMutationResult;
  });

export { AudioRecordingValidationError, AudioRecordingPdsError, FileConstraintError, BlobUploadError };
