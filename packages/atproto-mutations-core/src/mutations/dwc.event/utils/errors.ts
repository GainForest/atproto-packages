import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class DwcEventValidationError extends Data.TaggedError(
  "DwcEventValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class DwcEventNotFoundError extends Data.TaggedError(
  "DwcEventNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcEventPdsError extends Data.TaggedError("DwcEventPdsError")<{
  message: string;
  cause?: unknown;
}> {}
