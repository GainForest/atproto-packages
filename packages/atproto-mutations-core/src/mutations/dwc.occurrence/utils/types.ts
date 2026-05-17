import type { Main as DwcOccurrenceRecord } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordMutationResult,
} from "../../../utils/shared/types";

export type { DwcOccurrenceRecord };

/** Returned by createDwcOccurrence. */
export type DwcOccurrenceMutationResult = RecordMutationResult<DwcOccurrenceRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

type CreateDwcOccurrenceData = Omit<DwcOccurrenceRecord, "$type" | "createdAt">;

export type CreateDwcOccurrenceInput = CreateDwcOccurrenceData & {
  rkey?: string;
};

// ---------------------------------------------------------------------------
// Update / Delete
// ---------------------------------------------------------------------------

export type UpdateDwcOccurrenceData = Partial<CreateDwcOccurrenceData>;

export type UpdateDwcOccurrenceInput = {
  rkey: string;
  data: UpdateDwcOccurrenceData;
  unset?: ReadonlyArray<keyof UpdateDwcOccurrenceData>;
};

export type { DeleteRecordInput, DeleteRecordResult };

export type DeleteDwcOccurrenceCascadeInput = DeleteRecordInput;

export type DeleteDwcOccurrenceCascadeResult = DeleteRecordResult & {
  deletedMeasurementRkeys: string[];
  deletedMultimediaRkeys: string[];
};
