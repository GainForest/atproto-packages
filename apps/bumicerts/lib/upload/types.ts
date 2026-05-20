import type { CreateDwcOccurrenceInput } from "@gainforest/atproto-mutations-next";

export type ColumnMapping = {
  sourceColumn: string;
  targetField: string;
  transform?: (value: string) => string;
};

export type MappedRow = Record<string, string>;

export type OccurrenceInput = {
  scientificName: string;
  eventDate: string;
  decimalLatitude: number;
  decimalLongitude: number;
  basisOfRecord?: NonNullable<CreateDwcOccurrenceInput["basisOfRecord"]>;
  vernacularName?: string;
  recordedBy?: string;
  locality?: string;
  country?: string;
  countryCode?: string;
  occurrenceRemarks?: string;
  habitat?: string;
  samplingProtocol?: string;
  kingdom?: string;
  siteRef?: string;
  establishmentMeans?: string;
  datasetRef?: string;
  dynamicProperties?: string;
};

export type FloraMeasurementBundle = {
  dbh?: string;
  totalHeight?: string;
  diameter?: string; // maps to basalDiameter in PDS
  canopyCoverPercent?: string;
};

export type UrlPhotoEntry = {
  source: "url";
  url: string;
  subjectPart: string;
};

export type KoboZipPhotoEntry = {
  source: "koboZip";
  entryPath: string;
  fileName: string;
  mimeType: string;
  subjectPart: string;
};

export type PhotoEntry = UrlPhotoEntry | KoboZipPhotoEntry;

export type ValidatedRow = {
  index: number;
  occurrence: OccurrenceInput;
  floraMeasurement: FloraMeasurementBundle | null;
  photos?: PhotoEntry[];
};

export type RowError = {
  index: number;
  issues: { path: string; message: string }[];
};

export type TreeUploadRowAttentionKind = "skipped" | "failed" | "partial";

export type TreeUploadRowAttentionSummary = {
  sourceRowIndex: number;
  rowLabel: string;
  messages: string[];
  kind: TreeUploadRowAttentionKind;
};

export type ValidationResult = {
  valid: ValidatedRow[];
  errors: RowError[];
};

export type TargetField = {
  field: string;
  label: string;
  required: boolean;
  category: "occurrence" | "measurement" | "media";
};

export type TargetFieldTranslator = (
  key:
    | "scientificName"
    | "eventDate"
    | "decimalLatitude"
    | "decimalLongitude"
    | "vernacularName"
    | "recordedBy"
    | "locality"
    | "country"
    | "occurrenceRemarks"
    | "habitat"
    | "height"
    | "dbh"
    | "diameter"
    | "canopyCoverPercent"
    | "photoUrl",
) => string;

export function getTargetFieldLabel(
  field: string,
  t?: TargetFieldTranslator,
): string {
  if (t) {
    switch (field) {
      case "scientificName":
      case "eventDate":
      case "decimalLatitude":
      case "decimalLongitude":
      case "vernacularName":
      case "recordedBy":
      case "locality":
      case "country":
      case "occurrenceRemarks":
      case "habitat":
      case "height":
      case "dbh":
      case "diameter":
      case "canopyCoverPercent":
      case "photoUrl":
        return t(field);
    }
  }

  return TARGET_FIELDS.find((item) => item.field === field)?.label ?? field;
}

export const TARGET_FIELDS: TargetField[] = [
  // Required occurrence (4)
  { field: "scientificName", label: "Scientific Name", required: true, category: "occurrence" },
  { field: "eventDate", label: "Event Date", required: true, category: "occurrence" },
  { field: "decimalLatitude", label: "Decimal Latitude", required: true, category: "occurrence" },
  { field: "decimalLongitude", label: "Decimal Longitude", required: true, category: "occurrence" },
  // Optional occurrence (5)
  { field: "vernacularName", label: "Vernacular Name", required: false, category: "occurrence" },
  { field: "recordedBy", label: "Recorded By", required: false, category: "occurrence" },
  { field: "locality", label: "Locality", required: false, category: "occurrence" },
  { field: "country", label: "Country", required: false, category: "occurrence" },
  { field: "occurrenceRemarks", label: "Occurrence Remarks", required: false, category: "occurrence" },
  // Habitat (1)
  { field: "habitat", label: "Habitat", required: false, category: "occurrence" },
  // Measurement (4) — CSV-facing names are mapped to floraMeasurement fields during validation
  { field: "height", label: "Height", required: false, category: "measurement" },
  { field: "dbh", label: "DBH", required: false, category: "measurement" },
  { field: "diameter", label: "Diameter", required: false, category: "measurement" },
  { field: "canopyCoverPercent", label: "Canopy Cover (%)", required: false, category: "measurement" },
  // Media (1) — multiple columns can map to photoUrl; subject part is auto-detected from column name
  { field: "photoUrl", label: "Photo URL", required: false, category: "media" },
];
