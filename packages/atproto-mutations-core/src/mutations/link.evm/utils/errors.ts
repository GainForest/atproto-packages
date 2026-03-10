import { Data } from "effect";

/**
 * Input failed validation against the app.bumicerts.link.evm lexicon.
 * Raised by create/update before any PDS call.
 */
export class LinkEvmValidationError extends Data.TaggedError(
  "LinkEvmValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class LinkEvmPdsError extends Data.TaggedError(
  "LinkEvmPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * The requested link.evm record does not exist in the repo.
 * Raised by update and delete when the rkey is not found.
 */
export class LinkEvmNotFoundError extends Data.TaggedError(
  "LinkEvmNotFoundError"
)<{
  rkey: string;
}> {}
