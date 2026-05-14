import { isAtUriString } from "@atproto/lex";
import type {
  FloraMeasurementBundle,
  OccurrenceInput,
  PhotoEntry,
  TreeUploadRowAttentionKind,
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "@/lib/upload/types";
import {
  NO_UPLOAD_DATASET_SELECTION,
  isUploadDatasetSelection,
  type UploadDatasetSelection,
} from "@/lib/upload/upload-dataset-selection";
import {
  isUploadSiteSelection,
  uploadSiteHasBoundary,
  type UploadSiteSelection,
} from "@/lib/upload/site-selection";

export const STORAGE_KEY = "upload-trees-pending";
const SESSION_TTL_MS = 10 * 60 * 1000;

export type PendingUploadData = {
  ownerDid: string;
  uploadId?: string;
  validRows: ValidatedRow[];
  previewSkippedRows: TreeUploadRowAttentionSummary[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  siteSelection: UploadSiteSelection;
  timestamp: number;
};

type PendingUploadCandidate = {
  ownerDid: string;
  uploadId?: unknown;
  validRows: ValidatedRow[];
  previewSkippedRows?: TreeUploadRowAttentionSummary[];
  establishmentMeans?: unknown;
  datasetSelection?: unknown;
  siteSelection: UploadSiteSelection;
  timestamp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return typeof value === "string" || typeof value === "undefined";
}

function isOptionalAtUri(value: unknown): value is string | undefined {
  return (
    typeof value === "undefined" ||
    (typeof value === "string" && isAtUriString(value))
  );
}

function isTreeUploadRowAttentionKind(
  value: unknown,
): value is TreeUploadRowAttentionKind {
  return value === "skipped" || value === "failed" || value === "partial";
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
    value.decimalLatitude >= -90 &&
    value.decimalLatitude <= 90 &&
    typeof value.decimalLongitude === "number" &&
    Number.isFinite(value.decimalLongitude) &&
    value.decimalLongitude >= -180 &&
    value.decimalLongitude <= 180 &&
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
    isOptionalAtUri(value.siteRef) &&
    isOptionalString(value.establishmentMeans) &&
    isOptionalAtUri(value.datasetRef) &&
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
  if (!isRecord(value) || typeof value.subjectPart !== "string") {
    return false;
  }

  if (value.source === "url") {
    return typeof value.url === "string";
  }

  if (value.source === "koboZip") {
    return (
      typeof value.entryPath === "string" &&
      typeof value.fileName === "string" &&
      typeof value.mimeType === "string"
    );
  }

  return false;
}

function isValidatedRow(value: unknown): value is ValidatedRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.index === "number" &&
    Number.isInteger(value.index) &&
    value.index >= 0 &&
    isOccurrenceInput(value.occurrence) &&
    (value.floraMeasurement === null ||
      isFloraMeasurementBundle(value.floraMeasurement)) &&
    (typeof value.photos === "undefined" ||
      (Array.isArray(value.photos) && value.photos.every(isPhotoEntry)))
  );
}

function isTreeUploadRowAttentionSummary(
  value: unknown,
): value is TreeUploadRowAttentionSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sourceRowIndex === "number" &&
    Number.isInteger(value.sourceRowIndex) &&
    value.sourceRowIndex >= 0 &&
    typeof value.rowLabel === "string" &&
    Array.isArray(value.messages) &&
    value.messages.length > 0 &&
    value.messages.every((message) => typeof message === "string") &&
    isTreeUploadRowAttentionKind(value.kind)
  );
}

function rowsBelongToSelectedSite(
  rows: ValidatedRow[],
  siteSelection: UploadSiteSelection,
): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => row.occurrence.siteRef === siteSelection.uri)
  );
}

function isPendingUploadCandidate(
  value: unknown,
): value is PendingUploadCandidate {
  if (
    !isRecord(value) ||
    typeof value.ownerDid !== "string" ||
    !Array.isArray(value.validRows) ||
    !value.validRows.every(isValidatedRow) ||
    (typeof value.previewSkippedRows !== "undefined" &&
      (!Array.isArray(value.previewSkippedRows) ||
        !value.previewSkippedRows.every(isTreeUploadRowAttentionSummary))) ||
    !isUploadSiteSelection(value.siteSelection) ||
    !uploadSiteHasBoundary(value.siteSelection) ||
    typeof value.timestamp !== "number"
  ) {
    return false;
  }

  return rowsBelongToSelectedSite(value.validRows, value.siteSelection);
}

export function parsePendingUploadData(
  value: unknown,
  ownerDid: string,
  nowMs = Date.now(),
): PendingUploadData | null {
  if (!isPendingUploadCandidate(value)) {
    return null;
  }

  if (nowMs - value.timestamp > SESSION_TTL_MS) {
    return null;
  }

  if (value.ownerDid !== ownerDid) {
    return null;
  }

  return {
    ownerDid: value.ownerDid,
    uploadId: typeof value.uploadId === "string" ? value.uploadId : undefined,
    validRows: value.validRows,
    previewSkippedRows: value.previewSkippedRows ?? [],
    establishmentMeans:
      typeof value.establishmentMeans === "string" ||
      value.establishmentMeans === null
        ? value.establishmentMeans
        : null,
    datasetSelection: isUploadDatasetSelection(value.datasetSelection)
      ? value.datasetSelection
      : NO_UPLOAD_DATASET_SELECTION,
    siteSelection: value.siteSelection,
    timestamp: value.timestamp,
  };
}

export function persistPendingUpload({
  ownerDid,
  uploadId,
  validRows,
  previewSkippedRows,
  establishmentMeans,
  datasetSelection,
  siteSelection,
}: {
  ownerDid: string;
  uploadId?: string;
  validRows: ValidatedRow[];
  previewSkippedRows: TreeUploadRowAttentionSummary[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  siteSelection: UploadSiteSelection;
}): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ownerDid,
      ...(uploadId ? { uploadId } : {}),
      validRows,
      previewSkippedRows,
      establishmentMeans,
      datasetSelection,
      siteSelection,
      timestamp: Date.now(),
    } satisfies PendingUploadData),
  );
}

export function readPendingUpload(ownerDid: string): PendingUploadData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (isPendingUploadCandidate(parsed) && parsed.ownerDid !== ownerDid) {
      return null;
    }

    const pending = parsePendingUploadData(parsed, ownerDid);
    if (!pending) {
      clearPendingUpload();
      return null;
    }

    return pending;
  } catch {
    return null;
  }
}

export function clearPendingUpload(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
