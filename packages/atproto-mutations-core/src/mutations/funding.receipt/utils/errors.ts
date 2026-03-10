import { Data } from "effect";

/**
 * Input failed validation against the org.hypercerts.funding.receipt lexicon.
 * Raised by create before any PDS call.
 */
export class FundingReceiptValidationError extends Data.TaggedError(
  "FundingReceiptValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class FundingReceiptPdsError extends Data.TaggedError(
  "FundingReceiptPdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
