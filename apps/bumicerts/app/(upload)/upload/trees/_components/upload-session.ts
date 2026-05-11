import type { ValidatedRow } from "@/lib/upload/types";
import {
  NO_UPLOAD_DATASET_SELECTION,
  isUploadDatasetSelection,
  type UploadDatasetSelection,
} from "@/lib/upload/upload-dataset-selection";

export const STORAGE_KEY = "upload-trees-pending";
const SESSION_TTL_MS = 10 * 60 * 1000;

export type PendingUploadData = {
  ownerDid: string;
  uploadId?: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  timestamp: number;
};

type PendingUploadCandidate = {
  ownerDid: string;
  uploadId?: unknown;
  validRows: ValidatedRow[];
  establishmentMeans?: unknown;
  datasetSelection?: unknown;
  timestamp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPendingUploadCandidate(
  value: unknown,
): value is PendingUploadCandidate {
  return (
    isRecord(value) &&
    typeof value.ownerDid === "string" &&
    Array.isArray(value.validRows) &&
    typeof value.timestamp === "number"
  );
}

export function persistPendingUpload({
  ownerDid,
  uploadId,
  validRows,
  establishmentMeans,
  datasetSelection,
}: {
  ownerDid: string;
  uploadId?: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
}): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ownerDid,
      ...(uploadId ? { uploadId } : {}),
      validRows,
      establishmentMeans,
      datasetSelection,
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
    if (!isPendingUploadCandidate(parsed)) {
      clearPendingUpload();
      return null;
    }

    if (Date.now() - parsed.timestamp > SESSION_TTL_MS) {
      clearPendingUpload();
      return null;
    }

    if (parsed.ownerDid !== ownerDid) {
      return null;
    }

    return {
      ownerDid: parsed.ownerDid,
      uploadId: typeof parsed.uploadId === "string" ? parsed.uploadId : undefined,
      validRows: parsed.validRows,
      establishmentMeans:
        typeof parsed.establishmentMeans === "string" ||
        parsed.establishmentMeans === null
          ? parsed.establishmentMeans
          : null,
      datasetSelection: isUploadDatasetSelection(parsed.datasetSelection)
        ? parsed.datasetSelection
        : NO_UPLOAD_DATASET_SELECTION,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function clearPendingUpload(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
