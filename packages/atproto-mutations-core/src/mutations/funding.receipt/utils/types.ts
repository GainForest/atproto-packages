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
 * `from` is technically required by the lexicon but semantically optional —
 * for anonymous donors, pass the donor's wallet address (0x...) as a free
 * string (stored in `notes`) and leave `from` as an empty string or omit
 * it. The receipt is immutable/append-only so there is no update or delete.
 *
 * `rkey` is optional — PDS assigns a TID when absent.
 */
export type CreateFundingReceiptInput = RecordCreateInput<FundingReceiptRecord>;

/** Returned by createFundingReceipt on success. */
export type FundingReceiptMutationResult = RecordMutationResult<FundingReceiptRecord>;
