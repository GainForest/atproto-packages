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

type RequiredCreateDwcOccurrenceFields = {
  scientificName: DwcOccurrenceRecord["scientificName"];
  eventDate: DwcOccurrenceRecord["eventDate"];
  decimalLatitude: NonNullable<DwcOccurrenceRecord["decimalLatitude"]>;
  decimalLongitude: NonNullable<DwcOccurrenceRecord["decimalLongitude"]>;
};

type OptionalCreateDwcOccurrenceFields = Partial<
  Pick<
    DwcOccurrenceRecord,
    | "basisOfRecord"
    | "vernacularName"
    | "recordedBy"
    | "locality"
    | "country"
    | "countryCode"
    | "occurrenceRemarks"
    | "habitat"
    | "samplingProtocol"
    | "kingdom"
    | "occurrenceID"
    | "occurrenceStatus"
    | "geodeticDatum"
    | "license"
    | "projectRef"
    | "siteRef"
    | "datasetRef"
    | "dynamicProperties"
  >
>;

export type CreateDwcOccurrenceInput = RequiredCreateDwcOccurrenceFields &
  OptionalCreateDwcOccurrenceFields & {
    establishmentMeans?: string;
    rkey?: string;
  };

// ---------------------------------------------------------------------------
// Update / Delete
// ---------------------------------------------------------------------------

export type UpdateDwcOccurrenceData = Partial<Omit<CreateDwcOccurrenceInput, "rkey">>;

export type UpdateDwcOccurrenceInput = {
  rkey: string;
  data: UpdateDwcOccurrenceData;
  unset?: ReadonlyArray<keyof UpdateDwcOccurrenceData>;
};

export type { DeleteRecordInput, DeleteRecordResult };
