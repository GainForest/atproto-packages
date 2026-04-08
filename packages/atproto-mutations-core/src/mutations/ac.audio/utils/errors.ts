import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class AudioRecordingValidationError extends Data.TaggedError(
  "AudioRecordingValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
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
