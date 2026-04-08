import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class DwcOccurrenceValidationError extends Data.TaggedError(
  "DwcOccurrenceValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class DwcOccurrenceNotFoundError extends Data.TaggedError(
  "DwcOccurrenceNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcOccurrencePdsError extends Data.TaggedError(
  "DwcOccurrencePdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
