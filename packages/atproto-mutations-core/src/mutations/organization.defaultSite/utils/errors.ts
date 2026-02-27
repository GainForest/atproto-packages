import { Data } from "effect";

export class DefaultSiteValidationError extends Data.TaggedError(
  "DefaultSiteValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class DefaultSiteLocationNotFoundError extends Data.TaggedError(
  "DefaultSiteLocationNotFoundError"
)<{
  locationUri: string;
}> {}

export class DefaultSitePdsError extends Data.TaggedError(
  "DefaultSitePdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
