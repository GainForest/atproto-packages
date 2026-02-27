import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError, FileConstraintError } from "../../blob/errors";
import { fromSerializableFile, isAnyBlobRef, normalizeBlobRef } from "../../blob/types";
import { fetchRecord, putRecord } from "../../utils/shared";
import {
  AudioRecordingValidationError,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
} from "./utils/errors";
import type {
  UpdateAudioRecordingInput,
  AudioRecordingMutationResult,
  AudioRecordingRecord,
  AudioTechnicalMetadata,
} from "./utils/types";

const COLLECTION = "app.gainforest.organization.recordings.audio";
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

export const updateAudioRecording = (
  input: UpdateAudioRecordingInput
): Effect.Effect<
  AudioRecordingMutationResult,
  | AudioRecordingValidationError
  | AudioRecordingNotFoundError
  | AudioRecordingPdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, newAudioFile, newTechnicalMetadata } = input;

    // 1. Validate the new audio file (if provided) before any PDS calls.
    //    This catches size/MIME/missing-metadata errors offline.
    if (newAudioFile) {
      if (newAudioFile.size > MAX_AUDIO_BYTES) {
        return yield* Effect.fail(
          new FileConstraintError({
            path: ["newAudioFile"],
            reason: `Audio file size ${newAudioFile.size} B exceeds maximum ${MAX_AUDIO_BYTES} B (100 MB)`,
          })
        );
      }
      if (!ACCEPTED_AUDIO_MIMES.has(newAudioFile.type)) {
        return yield* Effect.fail(
          new FileConstraintError({
            path: ["newAudioFile"],
            reason: `MIME type "${newAudioFile.type}" is not accepted for audio recordings`,
          })
        );
      }
      if (!newTechnicalMetadata) {
        return yield* Effect.fail(
          new AudioRecordingValidationError({
            message: "newTechnicalMetadata must be provided when newAudioFile is supplied",
          })
        );
      }
    }

    // 2. Fetch the existing record.
    const existing = yield* fetchRecord<AudioRecordingRecord, AudioRecordingPdsError>(
      COLLECTION, rkey, makePdsError
    );
    if (existing === null) {
      return yield* Effect.fail(new AudioRecordingNotFoundError({ rkey }));
    }

    // 3. Determine blob + technical metadata.
    let audioBlob: { $type: string; file: unknown };
    let techMeta: AudioTechnicalMetadata;

    if (newAudioFile) {
      const agent = yield* AtprotoAgent;
      const fileBytes = fromSerializableFile(newAudioFile);
      const uploadResult = yield* Effect.tryPromise({
        try: () => agent.uploadBlob(fileBytes, { encoding: newAudioFile.type }),
        catch: (cause) => new BlobUploadError({ message: "Failed to upload audio blob", cause }),
      });
      // Use raw.mimeType from the PDS response — the PDS may normalize on upload
      // (e.g. "audio/wav" → "audio/vnd.wave"). The stored blobRef must use the
      // normalized mimeType so the PDS accepts the record write.
      const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
      audioBlob = {
        $type: "app.gainforest.common.defs#audio",
        file: { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size },
      };
      techMeta = newTechnicalMetadata!;
    } else {
      // Preserve existing blob — normalize class BlobRef if needed.
      const existingBlob = existing.blob as Record<string, unknown>;
      const normalizedFile = isAnyBlobRef(existingBlob["file"])
        ? normalizeBlobRef(existingBlob["file"])
        : existingBlob["file"];
      audioBlob = {
        $type: (existingBlob["$type"] as string) ?? "app.gainforest.common.defs#audio",
        file: normalizedFile,
      };
      // Preserve existing technical metadata.
      const existingMeta = existing.metadata as Record<string, unknown>;
      techMeta = {
        codec: existingMeta["codec"] as string,
        channels: existingMeta["channels"] as number,
        duration: existingMeta["duration"] as string,
        sampleRate: existingMeta["sampleRate"] as number,
      };
    }

    // 3. Build merged record.
    const existingMeta = existing.metadata as Record<string, unknown>;
    const merged = {
      $type: COLLECTION,
      name: data.name !== undefined ? data.name : existing.name,
      description: data.description !== undefined
        ? {
            $type: "app.gainforest.common.defs#richtext",
            text: data.description.text,
            facets: data.description.facets,
          }
        : existing.description,
      blob: audioBlob,
      metadata: {
        $type: "app.gainforest.organization.recordings.audio#metadata",
        codec: techMeta.codec,
        channels: techMeta.channels,
        duration: techMeta.duration,
        sampleRate: techMeta.sampleRate,
        recordedAt: data.metadata?.recordedAt ?? (existingMeta["recordedAt"] as string),
        coordinates: data.metadata?.coordinates !== undefined
          ? data.metadata.coordinates
          : (existingMeta["coordinates"] as string | undefined),
      },
      createdAt: existing.createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(merged),
      catch: (cause) => makeValidationError(`organization.recordings.audio record failed lexicon validation: ${String(cause)}`, cause),
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as AudioRecordingRecord,
    } satisfies AudioRecordingMutationResult;
  });

export {
  AudioRecordingValidationError,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
  FileConstraintError,
  BlobUploadError,
};
