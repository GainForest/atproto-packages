// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as LinkAttestationRecord } from "@gainforest/generated/org/impactindexer/link/attestation.defs";
export type { Eip712Message } from "@gainforest/generated/org/impactindexer/link/attestation.defs";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as LinkAttestationRecord } from "@gainforest/generated/org/impactindexer/link/attestation.defs";
import type {
  RecordMutationResult,
  RecordCreateInput,
} from "../../../utils/shared/types";

/**
 * Input for createLinkAttestation.
 * rkey is optional — PDS assigns a TID when absent.
 *
 * This record is immutable/append-only — there is no update, upsert, or delete.
 */
export type CreateLinkAttestationInput = RecordCreateInput<LinkAttestationRecord>;

/** Returned by createLinkAttestation on success. */
export type LinkAttestationMutationResult = RecordMutationResult<LinkAttestationRecord>;
