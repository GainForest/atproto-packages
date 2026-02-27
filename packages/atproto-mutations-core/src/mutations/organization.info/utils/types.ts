// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

// The canonical record shape as stored on the PDS.
export type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";

// Nested sub-types re-exported so callers don't need to reach into generated paths.
export type { Richtext } from "@gainforest/generated/app/gainforest/common/defs.defs";
export type { Main as LinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
export type { SmallImage } from "@gainforest/generated/org/hypercerts/defs.defs";

// ---------------------------------------------------------------------------
// Derived types — computed from OrganizationInfoRecord, never hand-written.
// Changing the lexicon regenerates OrganizationInfoRecord; these follow for free.
// ---------------------------------------------------------------------------

import type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";

/**
 * Valid objective values — extracted directly from the record type so they
 * stay in sync with the lexicon enum without manual duplication.
 */
export type Objective = OrganizationInfoRecord["objectives"][number];

/**
 * Input for createOrganizationInfo.
 *
 * Derived by stripping the fields that operations set internally:
 *   - $type  — always "app.gainforest.organization.info", set by create/upsert
 *   - createdAt — set once at creation time, never accepted from caller
 */
export type CreateOrganizationInfoInput = Omit<
  OrganizationInfoRecord,
  "$type" | "createdAt"
>;

/**
 * Input for updateOrganizationInfo.
 * Every field is optional — only the provided fields are changed.
 * createdAt remains non-patchable (excluded from CreateOrganizationInfoInput).
 */
export type UpdateOrganizationInfoInput = Partial<CreateOrganizationInfoInput>;

// ---------------------------------------------------------------------------
// Return type — what every operation yields on success.
// ---------------------------------------------------------------------------

/**
 * Returned by all three operations (create, update, upsert) on success.
 * uri and cid come from the PDS response; record is the committed value.
 */
export type OrganizationInfoMutationResult = {
  /** AT-URI of the record — at://<did>/app.gainforest.organization.info/self */
  uri: string;
  /** Content ID (CID) of the committed record */
  cid: string;
  /** The full committed record as stored on the PDS */
  record: OrganizationInfoRecord;
};
