import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class DwcMeasurementValidationError extends Data.TaggedError(
  "DwcMeasurementValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class DwcMeasurementNotFoundError extends Data.TaggedError(
  "DwcMeasurementNotFoundError"
)<{
  rkey: string;
}> {}

export class DwcMeasurementPdsError extends Data.TaggedError(
  "DwcMeasurementPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
