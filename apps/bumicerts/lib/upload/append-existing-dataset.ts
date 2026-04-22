import { links } from "@/lib/links";
import type {
  FloraMeasurementBundle,
  OccurrenceInput,
  PhotoEntry,
  ValidatedRow,
} from "@/lib/upload/types";

export type AppendExistingDatasetRequest = {
  datasetRkey: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
};

export type AppendExistingDatasetRowResult =
  | {
      index: number;
      state: "success";
      occurrenceUri: string;
      photoCount: number;
    }
  | {
      index: number;
      state: "partial";
      occurrenceUri: string;
      photoCount: number;
      error: string;
    }
  | {
      index: number;
      state: "error";
      error: string;
    };

export type AppendExistingDatasetResponse = {
  datasetUri: string;
  datasetRkey: string;
  datasetBecameUnavailable: boolean;
  results: AppendExistingDatasetRowResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "string" || typeof value === "undefined";
}

function isOccurrenceInput(value: unknown): value is OccurrenceInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.scientificName === "string" &&
    typeof value.eventDate === "string" &&
    typeof value.decimalLatitude === "number" &&
    Number.isFinite(value.decimalLatitude) &&
    typeof value.decimalLongitude === "number" &&
    Number.isFinite(value.decimalLongitude) &&
    isOptionalString(value.basisOfRecord) &&
    isOptionalString(value.vernacularName) &&
    isOptionalString(value.recordedBy) &&
    isOptionalString(value.locality) &&
    isOptionalString(value.country) &&
    isOptionalString(value.countryCode) &&
    isOptionalString(value.occurrenceRemarks) &&
    isOptionalString(value.habitat) &&
    isOptionalString(value.samplingProtocol) &&
    isOptionalString(value.kingdom) &&
    isOptionalString(value.establishmentMeans) &&
    isOptionalString(value.datasetRef) &&
    isOptionalString(value.dynamicProperties)
  );
}

function isFloraMeasurementBundle(value: unknown): value is FloraMeasurementBundle {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.dbh) &&
    isOptionalString(value.totalHeight) &&
    isOptionalString(value.diameter) &&
    isOptionalString(value.canopyCoverPercent)
  );
}

function isPhotoEntry(value: unknown): value is PhotoEntry {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    typeof value.subjectPart === "string"
  );
}

function isValidatedRow(value: unknown): value is ValidatedRow {
  if (!isRecord(value)) {
    return false;
  }

  const photos = value.photos;

  return (
    typeof value.index === "number" &&
    Number.isInteger(value.index) &&
    isOccurrenceInput(value.occurrence) &&
    (value.floraMeasurement === null ||
      isFloraMeasurementBundle(value.floraMeasurement)) &&
    (typeof photos === "undefined" ||
      (Array.isArray(photos) && photos.every(isPhotoEntry)))
  );
}

export function isAppendExistingDatasetRequest(
  value: unknown,
): value is AppendExistingDatasetRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.datasetRkey === "string" &&
    Array.isArray(value.validRows) &&
    value.validRows.every(isValidatedRow) &&
    (typeof value.establishmentMeans === "string" ||
      value.establishmentMeans === null)
  );
}

function isAppendExistingDatasetRowResult(
  value: unknown,
): value is AppendExistingDatasetRowResult {
  if (!isRecord(value) || typeof value.index !== "number") {
    return false;
  }

  if (value.state === "success") {
    return (
      typeof value.occurrenceUri === "string" &&
      typeof value.photoCount === "number"
    );
  }

  if (value.state === "partial") {
    return (
      typeof value.occurrenceUri === "string" &&
      typeof value.photoCount === "number" &&
      typeof value.error === "string"
    );
  }

  if (value.state === "error") {
    return typeof value.error === "string";
  }

  return false;
}

export function isAppendExistingDatasetResponse(
  value: unknown,
): value is AppendExistingDatasetResponse {
  return (
    isRecord(value) &&
    typeof value.datasetUri === "string" &&
    typeof value.datasetRkey === "string" &&
    typeof value.datasetBecameUnavailable === "boolean" &&
    Array.isArray(value.results) &&
    value.results.every(isAppendExistingDatasetRowResult)
  );
}

function getApiErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.error === "string" ? value.error : null;
}

export async function appendExistingDatasetUpload(
  request: AppendExistingDatasetRequest,
): Promise<AppendExistingDatasetResponse> {
  const response = await fetch(links.api.upload.trees.appendExistingDataset, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload) ?? "Failed to append upload to dataset.",
    );
  }

  if (!isAppendExistingDatasetResponse(payload)) {
    throw new Error("Unexpected append dataset response.");
  }

  return payload;
}
