import { Data } from "effect";

/**
 * Input failed validation against the org.impactindexer.link.attestation lexicon.
 * Raised by create before any PDS call.
 */
export class LinkAttestationValidationError extends Data.TaggedError(
  "LinkAttestationValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class LinkAttestationPdsError extends Data.TaggedError(
  "LinkAttestationPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
