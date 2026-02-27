import type {
  Main as AudioRecordingRecord,
  Metadata as AudioMetadata,
} from "@gainforest/generated/app/gainforest/organization/recordings/audio.defs";
import type { Richtext } from "@gainforest/generated/app/gainforest/common/defs.defs";
import type { SerializableFile } from "../../../blob/types";
import type {
  RecordMutationResult,
  DeleteRecordResult,
  DeleteRecordInput,
} from "../../../utils/shared/types";

export type { AudioRecordingRecord, AudioMetadata, Richtext };
export type { DeleteRecordResult, DeleteRecordInput };

/** Returned by create / update / upsert. */
export type AudioRecordingMutationResult = RecordMutationResult<AudioRecordingRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Technical audio metadata that the caller must supply.
 * Since `music-metadata` is not a dependency here, the calling application is
 * responsible for extracting these values from the audio file before passing
 * them to the mutation.
 */
export type AudioTechnicalMetadata = {
  /** Audio codec (e.g. "MPEG 1 Layer 3", "AAC", "PCM"). */
  codec: string;
  /** Number of audio channels (1 = mono, 2 = stereo, …). */
  channels: number;
  /** Duration of the recording in seconds, as a string (e.g. "142.5"). */
  duration: string;
  /** Sample rate in Hz (e.g. 44100). */
  sampleRate: number;
};

export type CreateAudioRecordingInput = {
  /** Short name / title for the recording. */
  name: string;
  /** Optional richtext description (text + optional facets). */
  description?: { text: string; facets?: unknown[] };
  /**
   * The audio file to upload (WAV, MP3, M4A, AAC, FLAC, OGG, Opus, WebM, AIFF).
   * Maximum 100 MB.
   */
  audioFile: SerializableFile;
  /** All technical + user metadata for the recording. */
  metadata: AudioTechnicalMetadata & {
    /** ISO 8601 datetime at which the audio was recorded. */
    recordedAt: string;
    /** Optional coordinates in "latitude,longitude" or "latitude,longitude,altitude" format. */
    coordinates?: string;
  };
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export type UpdateAudioRecordingInput = {
  /** rkey of the existing record to update. */
  rkey: string;
  /**
   * User-visible metadata fields to update. These are always writable.
   * If `newAudioFile` is also provided, all technical metadata fields must be
   * supplied as well (they are re-derived from the new file).
   */
  data: {
    name?: string;
    description?: { text: string; facets?: unknown[] };
    metadata?: {
      recordedAt?: string;
      coordinates?: string;
    };
  };
  /**
   * Optional replacement audio file. When provided:
   * - `technicalMetadata` must also be supplied (codec, channels, duration, sampleRate).
   * - The existing blob is replaced.
   *
   * When omitted:
   * - The existing blob is preserved.
   * - The existing technical metadata (codec, channels, duration, sampleRate) is preserved.
   */
  newAudioFile?: SerializableFile;
  /**
   * Required when `newAudioFile` is provided.
   * Supplies the technical metadata for the new file.
   */
  newTechnicalMetadata?: AudioTechnicalMetadata;
};

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------
/**
 * Same shape as CreateAudioRecordingInput — communicates create-or-update intent.
 */
export type UpsertAudioRecordingInput = CreateAudioRecordingInput;
