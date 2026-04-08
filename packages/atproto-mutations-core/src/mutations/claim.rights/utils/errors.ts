import { Data } from "effect";
import type { ValidationIssue } from "../../../result";

/**
 * Input failed validation against the org.hypercerts.claim.rights lexicon.
 * Raised by all operations (create, update, upsert) before any PDS call.
 */
export class ClaimRightsValidationError extends Data.TaggedError(
  "ClaimRightsValidationError"
)<{
  message: string;
  cause?: unknown;
  issues?: ValidationIssue[];
}> {}

/**
 * An update, upsert (with rkey), or delete was attempted but no record with
 * that rkey exists in the repo.
 */
export class ClaimRightsNotFoundError extends Data.TaggedError(
  "ClaimRightsNotFoundError"
)<{
  /** The rkey that was looked up */
  rkey: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class ClaimRightsPdsError extends Data.TaggedError(
  "ClaimRightsPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
