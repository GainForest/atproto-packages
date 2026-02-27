import type { Main as LayerRecord } from "@gainforest/generated/app/gainforest/organization/layer.defs";
import type {
  RecordMutationResult,
  DeleteRecordResult,
  DeleteRecordInput,
} from "../../../utils/shared/types";

export type { LayerRecord };
export type { DeleteRecordResult, DeleteRecordInput };

/** Returned by create / update / upsert. */
export type LayerMutationResult = RecordMutationResult<LayerRecord>;

/** Known layer type identifiers from the lexicon. */
export type LayerType = LayerRecord["type"];

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export type CreateLayerInput = {
  /** Layer display name (required, non-empty). */
  name: string;
  /** Layer type — determines how the data at `uri` is rendered. */
  type: LayerType;
  /** URL pointing to the layer data file or tile endpoint. */
  uri: string;
  /** Optional description. */
  description?: string;
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export type UpdateLayerInput = {
  /** rkey of the existing record to update. */
  rkey: string;
  data: {
    /** Updated name. Omit to preserve existing value. */
    name?: string;
    /** Updated type. Omit to preserve existing value. */
    type?: LayerType;
    /** Updated URI. Omit to preserve existing value. */
    uri?: string;
    /** Updated description. Omit to preserve existing value. */
    description?: string;
  };
  /** Fields to explicitly remove from the record. */
  unset?: Array<"description">;
};

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------
/**
 * Same shape as CreateLayerInput — communicates that create-or-update is
 * intended, with the full set of fields supplied each time.
 */
export type UpsertLayerInput = CreateLayerInput;
