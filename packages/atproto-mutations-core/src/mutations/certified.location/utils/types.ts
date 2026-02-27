import type { Main as CertifiedLocationRecord } from "@gainforest/generated/app/certified/location.defs";
import type { SerializableFile } from "../../../blob/types";
import type { RecordMutationResult, DeleteRecordResult, DeleteRecordInput } from "../../../utils/shared/types";

export type { CertifiedLocationRecord };
export type { DeleteRecordResult, DeleteRecordInput };

/** Returned by create / update / upsert. */
export type CertifiedLocationMutationResult = RecordMutationResult<CertifiedLocationRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export type CreateCertifiedLocationInput = {
  /** Optional human-readable name for this location. */
  name?: string;
  /** Optional description for this location. */
  description?: string;
  /**
   * The GeoJSON shapefile for this location (application/geo+json, max 10MB).
   * The file content is parsed, validated, and uploaded as a blob.
   */
  shapefile: SerializableFile;
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export type UpdateCertifiedLocationInput = {
  /** rkey of the existing record to update. */
  rkey: string;
  data: {
    /** Updated human-readable name. Omit to keep the existing value. */
    name?: string;
    /** Updated description. Omit to keep the existing value. */
    description?: string;
  };
  /**
   * Replacement GeoJSON file. If omitted the existing blob is preserved.
   * application/geo+json, max 10MB.
   */
  newShapefile?: SerializableFile;
};

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------
/**
 * Semantically identical to CreateCertifiedLocationInput — all the same
 * fields, but communicates that create-or-update behaviour is intended.
 */
export type UpsertCertifiedLocationInput = CreateCertifiedLocationInput;
