import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

export class AcDeploymentValidationError extends Data.TaggedError(
  "AcDeploymentValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

export class AcDeploymentNotFoundError extends Data.TaggedError(
  "AcDeploymentNotFoundError"
)<{
  rkey: string;
}> {}

export class AcDeploymentPdsError extends Data.TaggedError(
  "AcDeploymentPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
