// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as FundingReceiptRecord } from "@gainforest/generated/org/hypercerts/funding/receipt.defs";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as FundingReceiptRecord } from "@gainforest/generated/org/hypercerts/funding/receipt.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
} from "../../../utils/shared/types";

/**
 * Input for createFundingReceipt.
 *
 * Field types (updated lexicon schema):
 * - `from`: Union of `{ $type?: "app.certified.defs#did", did: "did:..." }` or 
 *           `{ $type?: "com.atproto.repo.strongRef", uri: "at://...", cid: "..." }`,
 *           or undefined for anonymous donors
 * - `to`: Union of `{ $type?: "app.certified.defs#did", did: "did:..." }` or
 *         `{ $type?: "com.atproto.repo.strongRef", uri: "at://...", cid: "..." }` (REQUIRED)
 * - `for`: StrongRef object `{ uri: "at://...", cid: "..." }` — optional reference to activity/project
 * - `notes`: Always set with the template `${wallet} paid ${amount}${currency} using wallet` 
 *            to capture the actual wallet address for all donations (both anonymous and identified)
 *
 * The receipt is immutable/append-only so there is no update or delete.
 * `rkey` is optional — PDS assigns a TID when absent.
 */
export type CreateFundingReceiptInput = RecordCreateInput<FundingReceiptRecord>;

/** Returned by createFundingReceipt on success. */
export type FundingReceiptMutationResult = RecordMutationResult<FundingReceiptRecord>;
