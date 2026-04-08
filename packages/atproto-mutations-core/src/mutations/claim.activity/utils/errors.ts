import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

/**
 * Input failed validation against the org.hypercerts.claim.activity lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
export class ClaimActivityValidationError extends Data.TaggedError(
  "ClaimActivityValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
export class ClaimActivityNotFoundError extends Data.TaggedError(
  "ClaimActivityNotFoundError"
)<{
  /** The rkey that was looked up */
  rkey: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class ClaimActivityPdsError extends Data.TaggedError(
  "ClaimActivityPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
