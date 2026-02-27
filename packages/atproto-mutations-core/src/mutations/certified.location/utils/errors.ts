import { Data } from "effect";

export class CertifiedLocationValidationError extends Data.TaggedError(
  "CertifiedLocationValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class CertifiedLocationNotFoundError extends Data.TaggedError(
  "CertifiedLocationNotFoundError"
)<{
  rkey: string;
}> {}

export class CertifiedLocationPdsError extends Data.TaggedError(
  "CertifiedLocationPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}

/** Raised on delete when the location is set as the organization's default site. */
export class CertifiedLocationIsDefaultError extends Data.TaggedError(
  "CertifiedLocationIsDefaultError"
)<{
  uri: string;
}> {}
