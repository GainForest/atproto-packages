import { Data } from "effect";

export class AudioRecordingValidationError extends Data.TaggedError(
  "AudioRecordingValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class AudioRecordingNotFoundError extends Data.TaggedError(
  "AudioRecordingNotFoundError"
)<{
  rkey: string;
}> {}

export class AudioRecordingPdsError extends Data.TaggedError(
  "AudioRecordingPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
