import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class LayerValidationError extends Data.TaggedError(
  "LayerValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class LayerNotFoundError extends Data.TaggedError(
  "LayerNotFoundError"
)<{
  rkey: string;
}> {}

export class LayerPdsError extends Data.TaggedError(
  "LayerPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
