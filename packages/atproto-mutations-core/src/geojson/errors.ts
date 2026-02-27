import { Data } from "effect";

export class GeoJsonValidationError extends Data.TaggedError(
  "GeoJsonValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class GeoJsonProcessingError extends Data.TaggedError(
  "GeoJsonProcessingError"
)<{
  message: string;
  cause?: unknown;
}> {}
