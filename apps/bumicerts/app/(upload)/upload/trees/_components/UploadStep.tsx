"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Loader2,
  Camera,
  ImageDown,
  DatabaseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import type {
  PhotoEntry,
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "@/lib/upload/types";
import { occurrenceInputToCreateInput } from "@/lib/upload/occurrence-adapter";
import { fetchPhotoFromUrl } from "@/lib/upload/fetch-photo-from-url";
import {
  createTreeUploadRowAttentionSummary,
  getTreeUploadRowAttentionKindLabel,
  getValidatedRowLabel,
} from "@/lib/upload/row-attention";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import PhotoAttachModal from "@/components/global/modals/upload/photo-attachment";
import { formatError, isErrorCode } from "@/lib/utils/trpc-errors";
import { buildTreeDynamicProperties } from "@/lib/upload/tree-dynamic-properties";
import { getUploadTimeEstimate } from "@/lib/upload/time-estimate";
import { TREE_UPLOAD_EVENTS, type TreeUploadEventPayload } from "@/lib/analytics/events";
import { trackTreeUploadEvent } from "@/lib/analytics/hotjar";
import {
  loadKoboMediaZipArchive,
  readKoboMediaZipEntryAsSerializableFile,
  type KoboMediaZipArchive,
} from "@/lib/upload/kobo-media-zip";
import {
  APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS,
  toAppendExistingDatasetRows,
} from "@/lib/upload/append-existing-dataset";
import {
  checkUploadRowsAgainstSelectedSite,
  fetchUploadSiteBoundary,
  type SkippedBoundaryRow,
  type UploadableBoundaryRow,
} from "@/lib/upload/site-boundary";
import { uploadTreeDatasetsQueryKey } from "@/lib/upload/tree-upload-datasets";
import { type UploadDatasetSelection } from "@/lib/upload/upload-dataset-selection";
import type { UploadSiteSelection } from "@/lib/upload/site-selection";
import { useUploadStepEffects } from "./useUploadStepEffects";
import { clearPendingUpload } from "./upload-session";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RowStatus =
  | { state: "pending" }
  | { state: "uploading" }
  | { state: "success"; occurrenceUri: string; photoCount: number }
  | {
      state: "partial";
      occurrenceUri: string;
      photoCount: number;
      error: string;
    }
  | { state: "error"; error: string };

type UploadProgress = {
  current: number;
  total: number;
  successes: number;
  partials: number;
  failures: number;
  currentRow: string;
};

type PhotoFetchStatus = {
  inProgressCount: number;
  successCount: number;
  failureCount: number;
  lastError: string | null;
};

type PhotoFetchProgress = {
  current: number;
  total: number;
  successes: number;
  failures: number;
};

type PhotoUploadQueueEntry = {
  rowIndex: number;
  photo: PhotoEntry;
};

function buildPhotoFetchQueue(
  rows: ValidatedRow[],
  skippedRowIndexes: ReadonlySet<number>,
): PhotoUploadQueueEntry[] {
  const queue: PhotoUploadQueueEntry[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (skippedRowIndexes.has(i)) {
      continue;
    }

    const row = rows[i];
    if (!row?.photos) {
      continue;
    }

    for (const photo of row.photos) {
      queue.push({ rowIndex: i, photo });
    }
  }

  return queue;
}

function getInitialRowStatuses(
  rows: ValidatedRow[],
  skippedRows: SkippedBoundaryRow[],
): RowStatus[] {
  const statuses = rows.map<RowStatus>(() => ({ state: "pending" }));

  for (const skippedRow of skippedRows) {
    statuses[skippedRow.rowIndex] = {
      state: "error",
      error: skippedRow.message,
    };
  }

  return statuses;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_WARNING_MESSAGE =
  "The upload finished, but some views may take a moment to refresh.";
const EXISTING_DATASET_UNAVAILABLE_MESSAGE =
  "The selected dataset disappeared during upload. Remaining rows were not added.";
const UNCONFIRMED_EXISTING_DATASET_CHUNK_MESSAGE =
  "This chunk could not be confirmed. Some trees may already be saved; review Tree Manager before retrying.";

function getInitialPhotoFetchStatus(): PhotoFetchStatus {
  return {
    inProgressCount: 0,
    successCount: 0,
    failureCount: 0,
    lastError: null,
  };
}

function getOccurrenceUriFromStatus(status: RowStatus | undefined): string | null {
  if (status?.state === "success" || status?.state === "partial") {
    return status.occurrenceUri;
  }

  return null;
}

function hasPersistedOccurrence(status: RowStatus | undefined): boolean {
  return getOccurrenceUriFromStatus(status) !== null;
}

function getOccurrenceRkey(status: RowStatus | undefined): string | null {
  const occurrenceUri = getOccurrenceUriFromStatus(status);
  if (!occurrenceUri) {
    return null;
  }

  const rkey = occurrenceUri.split("/").pop();
  return typeof rkey === "string" && rkey.length > 0 ? rkey : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type UploadStepProps = {
  uploadId: string;
  did: string;
  validRows: ValidatedRow[];
  previewSkippedRows: TreeUploadRowAttentionSummary[];
  koboMediaZipFile: File | null;
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  siteSelection: UploadSiteSelection | null;
  backLabel: string;
  onBack: () => void;
  onComplete: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadStep({
  uploadId,
  did,
  validRows,
  previewSkippedRows,
  koboMediaZipFile,
  establishmentMeans,
  datasetSelection,
  siteSelection,
  backLabel,
  onBack,
  onComplete,
}: UploadStepProps) {
  const createDataset = trpc.dwc.dataset.create.useMutation();
  const deleteDataset = trpc.dwc.dataset.delete.useMutation();
  const updateDataset = trpc.dwc.dataset.update.useMutation();
  const appendExistingDataset = trpc.dwc.dataset.appendExisting.useMutation();
  const createOccurrence = trpc.dwc.occurrence.create.useMutation();
  const updateOccurrence = trpc.dwc.occurrence.update.useMutation();
  const deleteOccurrence = trpc.dwc.occurrence.delete.useMutation();
  const createMeasurement = trpc.dwc.measurement.create.useMutation();
  const createMultimedia = trpc.ac.multimedia.create.useMutation();
  const indexerUtils = indexerTrpc.useUtils();
  const queryClient = useQueryClient();
  const { pushModal, show } = useModal();

  const [uploadStarted, setUploadStarted] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadStartedAtMs, setUploadStartedAtMs] = useState<number | null>(null);
  const [uploadFatalError, setUploadFatalError] = useState<string | null>(null);
  const [datasetUpdateWarning, setDatasetUpdateWarning] = useState<string | null>(null);
  const [uploadedDatasetUri, setUploadedDatasetUri] = useState<string | null>(
    null,
  );
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [progress, setProgress] = useState<UploadProgress>({
    current: 0,
    total: validRows.length,
    successes: 0,
    partials: 0,
    failures: 0,
    currentRow: "",
  });
  const [rowStatuses, setRowStatuses] = useState<RowStatus[]>(
    validRows.map(() => ({ state: "pending" as const })),
  );
  const [failedRowsOpen, setFailedRowsOpen] = useState(false);
  const [skippedUploadRowIndexes, setSkippedUploadRowIndexes] = useState<
    number[]
  >([]);

  // Photo attachment state (manual)
  const [photoUris, setPhotoUris] = useState<Map<number, string[]>>(new Map());

  // Phase 2: background photo upload from public URLs or Kobo media ZIP entries
  const skippedUploadRowIndexSet = useMemo(
    () => new Set(skippedUploadRowIndexes),
    [skippedUploadRowIndexes],
  );
  const photoFetchQueue = useMemo(
    () => buildPhotoFetchQueue(validRows, skippedUploadRowIndexSet),
    [skippedUploadRowIndexSet, validRows],
  );
  const hasPhotoAttachments = photoFetchQueue.length > 0;

  const [photoFetchStarted, setPhotoFetchStarted] = useState(false);
  const [photoFetchDone, setPhotoFetchDone] = useState(false);
  const [photoFetchStartedAtMs, setPhotoFetchStartedAtMs] = useState<
    number | null
  >(null);
  const [photoFetchStatuses, setPhotoFetchStatuses] = useState<
    Record<number, PhotoFetchStatus>
  >({});
  const [photoFetchProgress, setPhotoFetchProgress] =
    useState<PhotoFetchProgress>({
      current: 0,
      total: photoFetchQueue.length,
      successes: 0,
      failures: 0,
    });

  // Prevent double-run in StrictMode
  const uploadRef = useRef(false);
  const photoFetchRef = useRef(false);
  const completionModalShownRef = useRef(false);

  const resolvedExistingDataset =
    datasetSelection.mode === "existing"
      ? datasetSelection.dataset
      : null;

  // ── Photo attachment ──────────────────────────────────────────────────────
  const handleAddPhoto = (
    rowIndex: number,
    occurrenceUri: string,
    speciesName: string,
  ) => {
    pushModal(
      {
        id: MODAL_IDS.MANAGE_PHOTO_ATTACH,
        content: (
          <PhotoAttachModal
            occurrenceUri={occurrenceUri}
            siteRef={siteSelection?.uri}
            speciesName={speciesName}
            onPhotoUploaded={(uploadedPhoto) => {
              if (uploadedPhoto.previewUrl) {
                URL.revokeObjectURL(uploadedPhoto.previewUrl);
              }
              setPhotoUris((prev) => {
                const next = new Map(prev);
                const existing = next.get(rowIndex) ?? [];
                next.set(rowIndex, [...existing, uploadedPhoto.uri]);
                return next;
              });
              setRowStatuses((prev) => {
                const next = [...prev];
                const s = next[rowIndex];
                if (s?.state === "success" || s?.state === "partial") {
                  next[rowIndex] = { ...s, photoCount: s.photoCount + 1 };
                }
                return next;
              });
            }}
          />
        ),
      },
      true,
    );
    show();
  };

  const setRefreshWarning = useCallback(() => {
    setDatasetUpdateWarning((prev) => prev ?? REFRESH_WARNING_MESSAGE);
  }, []);

  const invalidateTreeQueries = useCallback(async () => {
    const results = await Promise.allSettled([
      indexerUtils.datasets.list.invalidate({ did }),
      indexerUtils.dwc.occurrences.invalidate({ did }),
      indexerUtils.dwc.measurements.invalidate({ did }),
      queryClient.invalidateQueries({
        queryKey: uploadTreeDatasetsQueryKey(did),
      }),
    ]);

    if (results.some((result) => result.status === "rejected")) {
      setRefreshWarning();
    }
  }, [did, indexerUtils, queryClient, setRefreshWarning]);

  const detachUploadedRowsFromUnavailableDataset = useCallback(
    async (statuses: RowStatus[], rowIndexes: number[]) => {
      let demotedSuccesses = 0;

      for (const index of rowIndexes) {
        const status = statuses[index];
        if (!status || (status.state !== "success" && status.state !== "partial")) {
          continue;
        }

        const baseError =
          "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager.";
        const fallbackError =
          "The selected dataset disappeared during upload and this tree could not be moved out of that dataset automatically. Review it in Tree Manager.";
        const nextBaseError =
          status.state === "partial" ? `${status.error} ${baseError}` : baseError;
        const nextFallbackError =
          status.state === "partial"
            ? `${status.error} ${fallbackError}`
            : fallbackError;
        const rkey = getOccurrenceRkey(status);

        if (!rkey) {
          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextFallbackError,
          };
          continue;
        }

        try {
          await updateOccurrence.mutateAsync({
            rkey,
            data: {
              dynamicProperties: buildTreeDynamicProperties(),
            },
            unset: ["datasetRef"],
          });

          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextBaseError,
          };
        } catch {
          if (status.state === "success") {
            demotedSuccesses += 1;
          }
          statuses[index] = {
            state: "partial",
            occurrenceUri: status.occurrenceUri,
            photoCount: status.photoCount,
            error: nextFallbackError,
          };
        }
      }

      return demotedSuccesses;
    },
    [updateOccurrence],
  );

  // ── Upload logic ──────────────────────────────────────────────────────────
  const runUpload = useCallback(async () => {
    if (uploadRef.current) return;
    uploadRef.current = true;
    const uploadStartMs = Date.now();
    const previewSkippedCount = previewSkippedRows.length;
    const sourceTotalRows = validRows.length + previewSkippedCount;
    setClockMs(uploadStartMs);
    setUploadStartedAtMs(null);
    setPhotoFetchStartedAtMs(null);
    setUploadStarted(true);
    setUploadFatalError(null);
    setDatasetUpdateWarning(null);
    setUploadedDatasetUri(null);

    let rowsToUpload: UploadableBoundaryRow[] = [];
    let skippedRowsForUpload: SkippedBoundaryRow[] = [];
    let photoFetchQueueForUploadableRows: PhotoUploadQueueEntry[] = [];

    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_STARTED, {
      uploadId,
      datasetMode: datasetSelection.mode,
      totalRows: sourceTotalRows,
      validRows: validRows.length,
      invalidRows: previewSkippedCount,
      photoTotal: photoFetchQueue.length,
      hasKoboZip: koboMediaZipFile !== null,
    });

    if (!siteSelection) {
      const completedAtMs = Date.now();
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_FAILED, {
        uploadId,
        datasetMode: datasetSelection.mode,
        totalRows: sourceTotalRows,
        photoTotal: photoFetchQueueForUploadableRows.length,
        failureReason: "site_selection_missing",
        durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
      });
      setUploadFatalError(
        "This upload is missing its required site selection. Please start over and choose a site boundary.",
      );
      setClockMs(completedAtMs);
      setUploadDone(true);
      return;
    }

    try {
      const boundary = await fetchUploadSiteBoundary(siteSelection);
      const siteBoundaryCheck = checkUploadRowsAgainstSelectedSite({
        rows: validRows,
        siteSelection,
        boundary,
      });
      const skippedRowIndexes = siteBoundaryCheck.skippedRows.map(
        (row) => row.rowIndex,
      );
      const skippedRowIndexSet = new Set(skippedRowIndexes);
      const nextPhotoFetchQueue = siteBoundaryCheck.fatalError
        ? []
        : buildPhotoFetchQueue(validRows, skippedRowIndexSet);
      const nextStatuses = getInitialRowStatuses(
        validRows,
        siteBoundaryCheck.skippedRows,
      );

      rowsToUpload = siteBoundaryCheck.rowsToUpload;
      skippedRowsForUpload = siteBoundaryCheck.skippedRows;
      photoFetchQueueForUploadableRows = nextPhotoFetchQueue;

      setSkippedUploadRowIndexes(skippedRowIndexes);
      setRowStatuses(nextStatuses);
      setPhotoFetchStatuses({});
      setPhotoFetchProgress({
        current: 0,
        total: nextPhotoFetchQueue.length,
        successes: 0,
        failures: 0,
      });
      setProgress({
        current: siteBoundaryCheck.skippedRows.length,
        total: validRows.length,
        successes: 0,
        partials: 0,
        failures: siteBoundaryCheck.skippedRows.length,
        currentRow: "",
      });

      if (siteBoundaryCheck.fatalError) {
        const completedAtMs = Date.now();
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_FAILED, {
          uploadId,
          datasetMode: datasetSelection.mode,
          totalRows: sourceTotalRows,
          photoTotal: photoFetchQueueForUploadableRows.length,
          failureReason: "site_boundary_validation_failed",
          durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
        });
        setUploadFatalError(siteBoundaryCheck.fatalError);
        setClockMs(completedAtMs);
        setUploadDone(true);
        return;
      }

      if (rowsToUpload.length === 0) {
        const completedAtMs = Date.now();
        clearPendingUpload();
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_COMPLETED, {
          uploadId,
          datasetMode: datasetSelection.mode,
          totalRows: sourceTotalRows,
          savedRows: 0,
          partialRows: 0,
          failedRows: previewSkippedCount + siteBoundaryCheck.skippedRows.length,
          photoTotal: 0,
          hasKoboZip: false,
          durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
        });
        setClockMs(completedAtMs);
        setUploadDone(true);
        return;
      }
    } catch {
      const completedAtMs = Date.now();
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_FAILED, {
        uploadId,
        datasetMode: datasetSelection.mode,
        totalRows: sourceTotalRows,
        photoTotal: photoFetchQueueForUploadableRows.length,
        failureReason: "site_boundary_validation_failed",
        durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
      });
      setUploadFatalError(
        "Couldn't recheck the selected site boundary before upload. Please return to site selection and choose a valid GeoJSON boundary.",
      );
      setClockMs(completedAtMs);
      setUploadDone(true);
      return;
    }

    const needsKoboMediaZipFileForUploadableRows =
      photoFetchQueueForUploadableRows.some(
        (entry) => entry.photo.source === "koboZip",
      );

    if (needsKoboMediaZipFileForUploadableRows && !koboMediaZipFile) {
      const completedAtMs = Date.now();
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_FAILED, {
        uploadId,
        datasetMode: datasetSelection.mode,
        totalRows: sourceTotalRows,
        photoTotal: photoFetchQueueForUploadableRows.length,
        failureReason: "missing_kobo_media_zip",
        durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
      });
      setUploadFatalError(
        "This upload includes KoboToolbox ZIP photos, but the Media Attachments ZIP cannot be restored after a refresh or sign-in redirect. Please start over and select both the CSV export and matching Media Attachments ZIP.",
      );
      setClockMs(completedAtMs);
      setUploadDone(true);
      return;
    }

    // Clear sessionStorage once upload begins (state is no longer "pending")
    clearPendingUpload();

    // ── Phase 0: Resolve dataset target ───────────────────────────────────
    let datasetUri: string | undefined;
    let datasetRkey: string | undefined;
    if (datasetSelection.mode === "new" && datasetSelection.name.length > 0) {
      try {
        const dsResult = await createDataset.mutateAsync({
          name: datasetSelection.name,
          ...(datasetSelection.description.length > 0
            ? { description: datasetSelection.description }
            : {}),
          ...(establishmentMeans ? { establishmentMeans } : {}),
        });
        datasetUri = dsResult.uri;
        datasetRkey = dsResult.rkey;
        setUploadedDatasetUri(dsResult.uri);
      } catch {
        const completedAtMs = Date.now();
        trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_FAILED, {
          uploadId,
          datasetMode: datasetSelection.mode,
          totalRows: sourceTotalRows,
          photoTotal: photoFetchQueueForUploadableRows.length,
          failureReason: "dataset_create_failed",
          durationSeconds: Math.round((completedAtMs - uploadStartMs) / 1_000),
        });
        setUploadFatalError(
          "Couldn't create the new dataset for this upload. Please try again or continue without a dataset.",
        );
        setClockMs(completedAtMs);
        setUploadDone(true);
        return;
      }
    } else if (datasetSelection.mode === "existing") {
      const rowUploadStartMs = Date.now();
      setClockMs(rowUploadStartMs);
      setUploadStartedAtMs(rowUploadStartMs);

      const appendExistingDatasetRows = toAppendExistingDatasetRows(
        rowsToUpload.map(({ row }) => row),
        siteSelection.uri,
      );
      const nextStatuses = getInitialRowStatuses(validRows, skippedRowsForUpload);
      let successes = 0;
      let partials = 0;
      let failures = skippedRowsForUpload.length;
      let stopExistingDatasetUpload = false;

      for (
        let chunkStart = 0;
        chunkStart < appendExistingDatasetRows.length;
        chunkStart += APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS
      ) {
        const chunkRows = appendExistingDatasetRows.slice(
          chunkStart,
          chunkStart + APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS,
        );
        const chunkEntries = rowsToUpload.slice(
          chunkStart,
          chunkStart + APPEND_EXISTING_DWC_DATASET_CLIENT_ROWS,
        );
        const chunkEnd = chunkStart + chunkRows.length;
        const chunkLabel =
          chunkEntries.length === 1
            ? (chunkEntries[0]?.row.occurrence.scientificName ||
              `Row ${(chunkEntries[0]?.rowIndex ?? chunkStart) + 1}`)
            : `Rows ${chunkStart + 1}-${chunkEnd} of ${rowsToUpload.length}`;

        for (const entry of chunkEntries) {
          nextStatuses[entry.rowIndex] = { state: "uploading" };
        }
        setRowStatuses([...nextStatuses]);
        setProgress((prev) => ({
          ...prev,
          current: Math.min(
            skippedRowsForUpload.length + chunkStart + 1,
            validRows.length,
          ),
          currentRow: chunkLabel,
        }));

        try {
          const response = await appendExistingDataset.mutateAsync({
            datasetRkey: datasetSelection.dataset.rkey,
            rows: chunkRows,
            establishmentMeans,
          });
          const handledIndexes = new Set<number>();

          setUploadedDatasetUri(
            response.datasetBecameUnavailable ? null : response.datasetUri,
          );

          for (const result of response.results) {
            const entry = chunkEntries[result.index];
            if (!entry) {
              continue;
            }

            const globalIndex = entry.rowIndex;
            handledIndexes.add(result.index);

            if (result.state === "success") {
              successes += 1;
              nextStatuses[globalIndex] = {
                state: "success",
                occurrenceUri: result.occurrenceUri,
                photoCount: result.photoCount,
              };
              continue;
            }

            if (result.state === "partial") {
              partials += 1;
              nextStatuses[globalIndex] = {
                state: "partial",
                occurrenceUri: result.occurrenceUri,
                photoCount: result.photoCount,
                error: result.error,
              };
              continue;
            }

            failures += 1;
            nextStatuses[globalIndex] = {
              state: "error",
              error: result.error,
            };
          }

          for (const [chunkIndex] of chunkRows.entries()) {
            const entry = chunkEntries[chunkIndex];
            if (!entry || handledIndexes.has(chunkIndex)) {
              continue;
            }

            failures += 1;
            nextStatuses[entry.rowIndex] = {
              state: "error",
              error: "Unexpected append response for this row.",
            };
          }

          if (response.datasetBecameUnavailable) {
            const demotedSuccesses = await detachUploadedRowsFromUnavailableDataset(
              nextStatuses,
              rowsToUpload.slice(0, chunkStart).map((entry) => entry.rowIndex),
            );
            successes -= demotedSuccesses;
            partials += demotedSuccesses;
            setUploadedDatasetUri(null);

            for (
              let remainingIndex = chunkEnd;
              remainingIndex < rowsToUpload.length;
              remainingIndex += 1
            ) {
              const remainingEntry = rowsToUpload[remainingIndex];
              if (!remainingEntry) {
                continue;
              }

              nextStatuses[remainingEntry.rowIndex] = {
                state: "error",
                error: EXISTING_DATASET_UNAVAILABLE_MESSAGE,
              };
              failures += 1;
            }
            stopExistingDatasetUpload = true;
          }
        } catch (error) {
          const baseMessage = formatError(error);
          const datasetUnavailable = isErrorCode(error, "PRECONDITION_FAILED");
          const chunkMessage =
            datasetUnavailable
              ? EXISTING_DATASET_UNAVAILABLE_MESSAGE
              : `${baseMessage} ${UNCONFIRMED_EXISTING_DATASET_CHUNK_MESSAGE}`;

          if (datasetUnavailable) {
            const demotedSuccesses = await detachUploadedRowsFromUnavailableDataset(
              nextStatuses,
              rowsToUpload.slice(0, chunkStart).map((entry) => entry.rowIndex),
            );
            successes -= demotedSuccesses;
            partials += demotedSuccesses;
            setUploadedDatasetUri(null);
          }

          for (
            let remainingIndex = chunkStart;
            remainingIndex < rowsToUpload.length;
            remainingIndex += 1
          ) {
            const remainingEntry = rowsToUpload[remainingIndex];
            if (!remainingEntry) {
              continue;
            }

            nextStatuses[remainingEntry.rowIndex] = {
              state: "error",
              error: chunkMessage,
            };
            failures += 1;
          }

          stopExistingDatasetUpload = true;
        }

        setRowStatuses([...nextStatuses]);
        setProgress({
          current: successes + partials + failures,
          total: validRows.length,
          successes,
          partials,
          failures,
          currentRow: "",
        });

        if (stopExistingDatasetUpload) {
          break;
        }
      }

      if (successes + partials > 0) {
        await invalidateTreeQueries();
      }

      const completedAtMs = Date.now();
      trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_COMPLETED, {
        uploadId,
        datasetMode: datasetSelection.mode,
        totalRows: sourceTotalRows,
        savedRows: successes + partials,
        partialRows: partials,
        failedRows: previewSkippedCount + failures,
        photoTotal: photoFetchQueueForUploadableRows.length,
        hasKoboZip: koboMediaZipFile !== null,
        durationSeconds: Math.round((completedAtMs - rowUploadStartMs) / 1_000),
      });
      setClockMs(completedAtMs);
      setUploadDone(true);
      return;
    }

    // ── Phase 1: Create occurrences + measurements ────────────────────────
    const rowUploadStartMs = Date.now();
    setClockMs(rowUploadStartMs);
    setUploadStartedAtMs(rowUploadStartMs);

    let successes = 0;
    let partials = 0;
    let failures = skippedRowsForUpload.length;

    for (let uploadIndex = 0; uploadIndex < rowsToUpload.length; uploadIndex++) {
      const entry = rowsToUpload[uploadIndex];
      if (!entry) continue;
      const { row, rowIndex } = entry;
      const speciesName = row.occurrence.scientificName || `Row ${rowIndex + 1}`;

      // Mark row as uploading
      setRowStatuses((prev) => {
        const next = [...prev];
        next[rowIndex] = { state: "uploading" };
        return next;
      });
      setProgress((prev) => ({
        ...prev,
        current: Math.min(
          skippedRowsForUpload.length + uploadIndex + 1,
          validRows.length,
        ),
        currentRow: speciesName,
      }));

      try {
        // 1. Create occurrence — adapter converts number lat/lon → string for ATProto
        const occurrence: typeof row.occurrence = {
          ...row.occurrence,
          ...(establishmentMeans ? { establishmentMeans } : {}),
          siteRef: siteSelection.uri,
          ...(datasetUri ? { datasetRef: datasetUri } : {}),
          dynamicProperties: buildTreeDynamicProperties(datasetUri),
        };
        const occInput = occurrenceInputToCreateInput(occurrence);
        const occResult = await createOccurrence.mutateAsync(occInput);

        try {
          // 2. Create one bundled measurement record per occurrence
          if (row.floraMeasurement) {
            await createMeasurement.mutateAsync({
              occurrenceRef: occResult.uri,
              flora: {
                dbh: row.floraMeasurement.dbh,
                totalHeight: row.floraMeasurement.totalHeight,
                basalDiameter: row.floraMeasurement.diameter,
                canopyCoverPercent: row.floraMeasurement.canopyCoverPercent,
              },
            });
          }
        } catch (measurementError) {
          try {
            await deleteOccurrence.mutateAsync({ rkey: occResult.rkey });
          } catch {
            partials += 1;
            setRowStatuses((prev) => {
              const next = [...prev];
              next[rowIndex] = {
                state: "partial",
                occurrenceUri: occResult.uri,
                photoCount: 0,
                error:
                  "The tree was created, but its measurement failed and the automatic rollback did not complete. Review this tree in Tree Manager.",
              };
              return next;
            });
            setProgress((prev) => ({
              ...prev,
              current: Math.min(
                skippedRowsForUpload.length + uploadIndex + 1,
                validRows.length,
              ),
              currentRow: speciesName,
              successes,
              partials,
              failures,
            }));
            continue;
          }

          throw measurementError;
        }

        successes += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[rowIndex] = {
            state: "success",
            occurrenceUri: occResult.uri,
            photoCount: 0,
          };
          return next;
        });
      } catch (err) {
        failures += 1;
        setRowStatuses((prev) => {
          const next = [...prev];
          next[rowIndex] = { state: "error", error: formatError(err) };
          return next;
        });
      }

      setProgress((prev) => ({
        ...prev,
        successes,
        partials,
        failures,
      }));
    }

    // ── Phase 1.5: Update dataset with final recordCount ──────────────────
    const persistedOccurrences = successes + partials;
    if (
      datasetSelection.mode === "new" &&
      datasetRkey &&
      persistedOccurrences === 0
    ) {
      try {
        await deleteDataset.mutateAsync({ rkey: datasetRkey });
        setUploadedDatasetUri(null);
      } catch {
        setDatasetUpdateWarning(
          "The empty dataset could not be removed automatically. You can delete it later from Tree Manager.",
        );
      }
    }

    if (
      datasetSelection.mode !== "none" &&
      datasetRkey &&
      persistedOccurrences > 0
    ) {
      try {
        await updateDataset.mutateAsync({
          rkey: datasetRkey,
          data: { recordCount: persistedOccurrences },
        });
      } catch {
        setDatasetUpdateWarning(
          "The dataset was created, but its tree count could not be updated yet.",
        );
      }
    }

    if (persistedOccurrences > 0) {
      await invalidateTreeQueries();
    }

    const completedAtMs = Date.now();
    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.UPLOAD_COMPLETED, {
      uploadId,
      datasetMode: datasetSelection.mode,
      totalRows: sourceTotalRows,
      savedRows: successes + partials,
      partialRows: partials,
      failedRows: previewSkippedCount + failures,
      photoTotal: photoFetchQueueForUploadableRows.length,
      hasKoboZip: koboMediaZipFile !== null,
      durationSeconds: Math.round((completedAtMs - rowUploadStartMs) / 1_000),
    });
    setClockMs(completedAtMs);
    setUploadDone(true);
  }, [
    appendExistingDataset,
    createDataset,
    deleteDataset,
    deleteOccurrence,
    detachUploadedRowsFromUnavailableDataset,
    createOccurrence,
    createMeasurement,
    datasetSelection,
    establishmentMeans,
    invalidateTreeQueries,
    koboMediaZipFile,
    photoFetchQueue.length,
    previewSkippedRows.length,
    siteSelection,
    updateDataset,
    uploadId,
    validRows,
  ]);

  // ── Phase 2: Upload photos from URLs or Kobo ZIP (background) ─────────────
  const runPhotoFetch = useCallback(async () => {
    if (photoFetchRef.current) return;
    photoFetchRef.current = true;
    const photoFetchStartMs = Date.now();
    setClockMs(photoFetchStartMs);
    setPhotoFetchStartedAtMs(photoFetchStartMs);
    setPhotoFetchStarted(true);

    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.PHOTO_UPLOAD_STARTED, {
      uploadId,
      datasetMode: datasetSelection.mode,
      totalRows: validRows.length,
      photoTotal: photoFetchQueue.length,
      hasKoboZip: koboMediaZipFile !== null,
    });

    let successes = 0;
    let failures = 0;
    let koboMediaArchivePromise: Promise<KoboMediaZipArchive> | null = null;

    const getKoboMediaArchive = () => {
      if (!koboMediaZipFile) {
        return null;
      }

      koboMediaArchivePromise ??= loadKoboMediaZipArchive(koboMediaZipFile);
      return koboMediaArchivePromise;
    };

    for (let pIdx = 0; pIdx < photoFetchQueue.length; pIdx++) {
      const entry = photoFetchQueue[pIdx];
      if (!entry) continue;
      const { rowIndex, photo } = entry;
      const { subjectPart } = photo;

      // Find the occurrence URI from Phase 1
      const rowStatus = rowStatuses[rowIndex];
      const occurrenceUri = getOccurrenceUriFromStatus(rowStatus);
      if (!occurrenceUri) {
        // Occurrence failed — skip photo for this row
        failures += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            failureCount: (prev[rowIndex]?.failureCount ?? 0) + 1,
            lastError: "Occurrence upload failed; photo skipped.",
          },
        }));
        setPhotoFetchProgress((prev) => ({
          ...prev,
          current: pIdx + 1,
          failures,
        }));
        continue;
      }

      // Mark as uploading
      setPhotoFetchStatuses((prev) => ({
        ...prev,
        [rowIndex]: {
          ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
          inProgressCount: (prev[rowIndex]?.inProgressCount ?? 0) + 1,
        },
      }));
      setPhotoFetchProgress((prev) => ({
        ...prev,
        current: pIdx + 1,
      }));

      try {
        const result =
          photo.source === "url"
            ? await fetchPhotoFromUrl({
                url: photo.url,
                occurrenceRef: occurrenceUri,
                siteRef: siteSelection?.uri,
                subjectPart,
              })
            : await (async () => {
                const archivePromise = getKoboMediaArchive();
                if (!archivePromise) {
                  throw new Error(
                    "Kobo Media Attachments ZIP is no longer available. Go back, reselect the ZIP, and retry the upload.",
                  );
                }

                const archive = await archivePromise;
                const serializableFile =
                  await readKoboMediaZipEntryAsSerializableFile({
                    archive,
                    entryPath: photo.entryPath,
                    fileName: photo.fileName,
                    mimeType: photo.mimeType,
                  });

                const uploadResult = await createMultimedia.mutateAsync({
                  imageFile: serializableFile,
                  occurrenceRef: occurrenceUri,
                  siteRef: siteSelection?.uri,
                  subjectPart,
                  caption: `Imported from KoboToolbox Media Attachments ZIP: ${photo.fileName}`,
                  format: serializableFile.type,
                });

                return {
                  uri: uploadResult.uri,
                  rkey: uploadResult.rkey,
                  cid: uploadResult.cid,
                };
              })();

        successes += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            inProgressCount: Math.max(
              0,
              (prev[rowIndex]?.inProgressCount ?? 0) - 1,
            ),
            successCount: (prev[rowIndex]?.successCount ?? 0) + 1,
          },
        }));

        // Also update the row's photo count + photo URIs
        setPhotoUris((prev) => {
          const next = new Map(prev);
          const existing = next.get(rowIndex) ?? [];
          next.set(rowIndex, [...existing, result.uri]);
          return next;
        });
        setRowStatuses((prev) => {
          const next = [...prev];
          const s = next[rowIndex];
          if (s?.state === "success" || s?.state === "partial") {
            next[rowIndex] = { ...s, photoCount: s.photoCount + 1 };
          }
          return next;
        });
      } catch (err) {
        failures += 1;
        setPhotoFetchStatuses((prev) => ({
          ...prev,
          [rowIndex]: {
            ...(prev[rowIndex] ?? getInitialPhotoFetchStatus()),
            inProgressCount: Math.max(
              0,
              (prev[rowIndex]?.inProgressCount ?? 0) - 1,
            ),
            failureCount: (prev[rowIndex]?.failureCount ?? 0) + 1,
            lastError: formatError(err),
          },
        }));
      }

      setPhotoFetchProgress((prev) => ({
        ...prev,
        successes,
        failures,
      }));
    }

    const completedAtMs = Date.now();
    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.PHOTO_UPLOAD_COMPLETED, {
      uploadId,
      datasetMode: datasetSelection.mode,
      totalRows: validRows.length,
      photoTotal: photoFetchQueue.length,
      photoSucceeded: successes,
      photoFailed: failures,
      hasKoboZip: koboMediaZipFile !== null,
      durationSeconds: Math.round((completedAtMs - photoFetchStartMs) / 1_000),
    });
    setClockMs(completedAtMs);
    setPhotoFetchDone(true);

    if (successes > 0) {
      await indexerUtils.multimedia.list.invalidate({ did }).catch(() => {
        setRefreshWarning();
      });
    }
  }, [
    createMultimedia,
    datasetSelection.mode,
    did,
    indexerUtils,
    koboMediaZipFile,
    photoFetchQueue,
    rowStatuses,
    setRefreshWarning,
    siteSelection?.uri,
    uploadId,
    validRows.length,
  ]);

  const rowAttentionSummaries = useMemo(() => {
    const uploadAttentionSummaries = rowStatuses.flatMap((status, rowIndex) => {
      if (status.state !== "error" && status.state !== "partial") {
        return [];
      }

      const row = validRows[rowIndex];
      if (!row) {
        return [];
      }

      return [
        createTreeUploadRowAttentionSummary({
          sourceRowIndex: row.index,
          rowLabel: getValidatedRowLabel(row),
          messages: [status.error],
          kind:
            status.state === "partial"
              ? "partial"
              : skippedUploadRowIndexSet.has(rowIndex)
                ? "skipped"
                : "failed",
        }),
      ];
    });

    return [...previewSkippedRows, ...uploadAttentionSummaries].sort(
      (a, b) => a.sourceRowIndex - b.sourceRowIndex,
    );
  }, [previewSkippedRows, rowStatuses, skippedUploadRowIndexSet, validRows]);

  // ── Derived values ────────────────────────────────────────────────────────
  const {
    current,
    total: uploadTotal,
    successes,
    partials,
    failures,
    currentRow,
  } = progress;
  const completedRows = successes + partials + failures;
  const progressPercent =
    uploadTotal > 0 ? Math.round((current / uploadTotal) * 100) : 0;
  const progressLabel =
    uploadStarted && current > 0
      ? `Uploading row ${current} of ${uploadTotal}${
          currentRow ? ` — ${currentRow}` : ""
        }...`
      : "Preparing upload...";
  const treeUploadTimeEstimate = getUploadTimeEstimate({
    startedAtMs: uploadStartedAtMs,
    nowMs: clockMs,
    completedUnits: completedRows,
    totalUnits: uploadTotal,
    isComplete: uploadDone,
    unitLabel: "record",
  });
  const selectedDatasetName =
    datasetSelection.mode === "new"
      ? datasetSelection.name
      : resolvedExistingDataset?.name ?? null;
  const sourceTotalCount = uploadTotal + previewSkippedRows.length;
  const totalFailureCount = failures + previewSkippedRows.length;
  const attentionCount = rowAttentionSummaries.length;
  const persistedCount = successes + partials;
  const allSucceeded =
    uploadDone && totalFailureCount === 0 && partials === 0 && !uploadFatalError;
  const someFailed = uploadDone && attentionCount > 0 && !uploadFatalError;

  // Phase 2 is complete when either there are no photo attachments, photo upload is done,
  // or the upload stopped before any records were written.
  const hasPhotoFetchWork = hasPhotoAttachments && persistedCount > 0;
  const allPhasesComplete = uploadFatalError
    ? uploadDone
    : uploadDone && (!hasPhotoFetchWork || photoFetchDone);
  const isUploadInProgress = uploadStarted && !allPhasesComplete;
  const showBackNavigation = !uploadDone;
  const photoFetchPercent =
    photoFetchProgress.total > 0
      ? Math.round(
          (photoFetchProgress.current / photoFetchProgress.total) * 100,
        )
      : 0;
  const completedPhotoFetches =
    photoFetchProgress.successes + photoFetchProgress.failures;
  const photoFetchTimeEstimate = getUploadTimeEstimate({
    startedAtMs: photoFetchStartedAtMs,
    nowMs: clockMs,
    completedUnits: completedPhotoFetches,
    totalUnits: photoFetchProgress.total,
    isComplete: photoFetchDone,
    unitLabel: "photo attachment",
  });
  const hasUploadedTrees = persistedCount > 0;
  const treeManagerHref = links.manage.treesFiltered({
    dataset: uploadedDatasetUri,
  });
  const treeManagerLabel = uploadedDatasetUri
    ? "View Dataset in Tree Manager"
    : "View Trees in Tree Manager";
  const uploadDurationSeconds = uploadStartedAtMs
    ? Math.max(0, Math.round((clockMs - uploadStartedAtMs) / 1_000))
    : null;
  const completionAnalyticsPayload = useMemo<TreeUploadEventPayload>(() => {
    const payload: TreeUploadEventPayload = {
      uploadId,
      datasetMode: datasetSelection.mode,
      totalRows: sourceTotalCount,
      savedRows: persistedCount,
      partialRows: partials,
      failedRows: totalFailureCount,
      photoTotal: photoFetchProgress.total,
      photoSucceeded: photoFetchProgress.successes,
      photoFailed: photoFetchProgress.failures,
      hasKoboZip: koboMediaZipFile !== null,
    };

    if (uploadDurationSeconds !== null) {
      return {
        ...payload,
        durationSeconds: uploadDurationSeconds,
      };
    }

    return payload;
  }, [
    datasetSelection.mode,
    koboMediaZipFile,
    partials,
    persistedCount,
    photoFetchProgress.failures,
    photoFetchProgress.successes,
    photoFetchProgress.total,
    sourceTotalCount,
    totalFailureCount,
    uploadDurationSeconds,
    uploadId,
  ]);

  useUploadStepEffects({
    did,
    uploadId,
    validRows,
    previewSkippedRows,
    establishmentMeans,
    datasetSelection,
    siteSelection,
    uploadStarted,
    runUpload,
    uploadDone,
    hasPhotoAttachments,
    persistedCount,
    photoFetchStarted,
    uploadFatalError,
    runPhotoFetch,
    isUploadInProgress,
    setClockMs,
    allPhasesComplete,
    hasUploadedTrees,
    completionModalShownRef,
    total: sourceTotalCount,
    partials,
    failures: totalFailureCount,
    rowAttentionSummaries,
    photoFailureCount: photoFetchProgress.failures,
    treeManagerHref,
    treeManagerLabel,
    completionAnalyticsPayload,
    onComplete,
    pushModal,
    show,
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Saving your records</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Saving {uploadTotal} tree record{uploadTotal !== 1 ? "s" : ""} to
          the GainForest network.
        </p>
        {siteSelection ? (
          <p className="text-xs text-muted-foreground mt-1">
            Assigning these trees to {siteSelection.name}.
          </p>
        ) : null}
        {selectedDatasetName ? (
          <p className="text-xs text-muted-foreground mt-1">
            {datasetSelection.mode === "existing"
              ? `Adding this upload to ${selectedDatasetName}.`
              : `Creating dataset ${selectedDatasetName} for this upload.`}
          </p>
        ) : null}
      </div>

      {isUploadInProgress ? (
        <div className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Do not refresh or close this page</p>
            <p>
              Keep this tab open until the upload completes. Refreshing now may
              interrupt saving records or photos.
            </p>
          </div>
        </div>
      ) : null}

      {/* Progress bar */}
      {!uploadDone && (
        <div className="space-y-2">
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              {progressLabel}
            </span>
            <span className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {treeUploadTimeEstimate.label}
              </span>
              <span className="font-mono">{progressPercent}%</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {successes} succeeded
              {partials > 0 ? `, ${partials} need follow-up` : ""}
              {`, ${failures} failed`}
            </p>
            <p>{treeUploadTimeEstimate.description}</p>
          </div>
        </div>
      )}

      {/* Completion banner — all succeeded */}
      {uploadFatalError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{uploadFatalError}</span>
        </div>
      ) : null}

      {uploadDone && allSucceeded && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Successfully uploaded {successes} tree record
            {successes !== 1 ? "s" : ""}.
          </span>
        </div>
      )}

      {/* Completion banner — some failed */}
      {uploadDone && someFailed && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {persistedCount} record{persistedCount !== 1 ? "s" : ""} saved
            {partials > 0 ? `, ${partials} need follow-up` : ""}
            {totalFailureCount > 0
              ? `, ${totalFailureCount} skipped or failed.`
              : "."}
          </span>
        </div>
      )}

      {datasetUpdateWarning ? (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{datasetUpdateWarning}</span>
        </div>
      ) : null}

      {/* Phase 2: Photo upload progress */}
      {uploadDone && hasPhotoFetchWork && !uploadFatalError && (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <ImageDown className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              {photoFetchDone
                ? "Photo upload complete"
                : "Uploading photos…"}
            </h3>
          </div>

          {!photoFetchDone && (
            <>
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  Photo {photoFetchProgress.current} of{" "}
                  {photoFetchProgress.total}
                </span>
                <span className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {photoFetchTimeEstimate.label}
                  </span>
                  <span className="font-mono">{photoFetchPercent}%</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${photoFetchPercent}%` }}
                />
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {photoFetchProgress.successes} uploaded
            {photoFetchProgress.failures > 0
              ? `, ${photoFetchProgress.failures} failed`
              : ""}
            {" of "}
            {photoFetchProgress.total} photo attachment
            {photoFetchProgress.total !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {photoFetchTimeEstimate.description}
          </p>

          {photoFetchDone && photoFetchProgress.failures > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Some photos could not be uploaded. You can add them manually using
              the Tree Manager.
            </p>
          )}
        </div>
      )}

      {/* Per-row status list */}
      {!uploadFatalError ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {validRows.map((row, i) => {
              const status = rowStatuses[i];
              const species = getValidatedRowLabel(row);
              const rowPhotos = photoUris.get(i) ?? [];
              const hasOccurrence = hasPersistedOccurrence(status);
              const occUri = getOccurrenceUriFromStatus(status);
              const truncatedUri = occUri
                ? occUri.length > 32
                  ? `…${occUri.slice(-28)}`
                  : occUri
                : null;
              return (
                <div
                  key={row.index}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">
                    {row.index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{species}</span>
                    {truncatedUri ? (
                      <span className="block text-xs text-muted-foreground font-mono truncate">
                        {truncatedUri}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rowPhotos.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Camera className="h-3 w-3" />
                        {rowPhotos.length}
                      </span>
                    ) : null}
                    {(() => {
                      const pfs = photoFetchStatuses[i];
                      if ((pfs?.inProgressCount ?? 0) > 0) {
                        return (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageDown className="h-3 w-3 animate-pulse" />
                          </span>
                        );
                      }
                      if ((pfs?.failureCount ?? 0) > 0) {
                        return (
                          <span
                            className="text-xs text-yellow-500"
                            title={
                              pfs?.lastError ??
                              `${pfs?.failureCount ?? 0} photo upload${(pfs?.failureCount ?? 0) === 1 ? "" : "s"} failed.`
                            }
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        );
                      }
                      return null;
                    })()}
                    <span>
                      {status?.state === "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      ) : null}
                      {status?.state === "uploading" ? (
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      ) : null}
                      {status?.state === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : null}
                      {status?.state === "partial" ? (
                        <span title={status.error}>
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </span>
                      ) : null}
                      {status?.state === "error" ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </span>
                    {hasOccurrence && occUri && allPhasesComplete ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => handleAddPhoto(i, occUri, species)}
                      >
                        <Camera className="h-3 w-3" />
                        Add Photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Failed rows detail (collapsible) */}
      {rowAttentionSummaries.length > 0 && !uploadFatalError && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/30 transition-colors"
            onClick={() => setFailedRowsOpen((v) => !v)}
          >
            <span className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              {attentionCount} row{attentionCount !== 1 ? "s" : ""} need attention
            </span>
            {failedRowsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {failedRowsOpen && (
            <div className="border-t border-destructive/20 px-4 py-3">
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {rowAttentionSummaries.map((summary) => {
                  const statusLabel = getTreeUploadRowAttentionKindLabel(
                    summary.kind,
                  );

                  return (
                    <li
                      key={`${summary.kind}-${summary.sourceRowIndex}`}
                      className="text-xs border border-destructive/20 rounded-md p-2 space-y-1"
                    >
                      <p className="font-medium text-foreground">
                        Row {summary.sourceRowIndex + 1} — {summary.rowLabel}
                      </p>
                      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                        {statusLabel}
                      </p>
                      <ul className="space-y-0.5">
                        {summary.messages.map((message, messageIndex) => (
                          <li key={messageIndex} className="text-destructive">
                            {message}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className={`flex items-center pt-2 border-t border-border ${
          showBackNavigation ? "justify-between" : "justify-end"
        }`}
      >
        {showBackNavigation ? (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={uploadStarted && !allPhasesComplete}
          >
            {backLabel}
          </Button>
        ) : null}

        {allPhasesComplete && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onComplete}>
              {uploadFatalError ? "Start Over" : "Upload More Data"}
            </Button>
            {!uploadFatalError && hasUploadedTrees ? (
              <Button asChild>
                <Link href={treeManagerHref}>
                  <DatabaseIcon />
                  {treeManagerLabel}
                </Link>
              </Button>
            ) : !uploadFatalError ? (
              <Button onClick={onComplete}>Done</Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export { readPendingUpload, type PendingUploadData } from "./upload-session";
