import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class DefaultSiteValidationError extends Data.TaggedError(
  "DefaultSiteValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
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
