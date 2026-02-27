import { Data } from "effect";

export class LayerValidationError extends Data.TaggedError(
  "LayerValidationError"
)<{
  message: string;
  cause?: unknown;
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
