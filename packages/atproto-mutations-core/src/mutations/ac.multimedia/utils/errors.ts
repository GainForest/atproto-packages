import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class AcMultimediaValidationError extends Data.TaggedError(
  "AcMultimediaValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class AcMultimediaNotFoundError extends Data.TaggedError(
  "AcMultimediaNotFoundError"
)<{
  rkey: string;
}> {}

export class AcMultimediaPdsError extends Data.TaggedError(
  "AcMultimediaPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
