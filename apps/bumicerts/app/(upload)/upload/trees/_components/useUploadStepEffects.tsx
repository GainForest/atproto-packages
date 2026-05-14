"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type {
  TreeUploadRowAttentionSummary,
  ValidatedRow,
} from "@/lib/upload/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import type { TreeUploadEventPayload } from "@/lib/analytics/events";
import { trackTreeUploadFeedbackPromptShown } from "@/lib/analytics/hotjar";
import { TreeUploadCompleteModal } from "./TreeUploadCompleteModal";
import { persistPendingUpload } from "./upload-session";
import type { UploadDatasetSelection } from "@/lib/upload/upload-dataset-selection";
import type { UploadSiteSelection } from "@/lib/upload/site-selection";

type ModalController = ReturnType<
  (typeof import("@/components/ui/modal/context"))["useModal"]
>;

type UseUploadStepEffectsArgs = {
  did: string;
  uploadId: string;
  validRows: ValidatedRow[];
  previewSkippedRows: TreeUploadRowAttentionSummary[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
  siteSelection: UploadSiteSelection | null;
  uploadStarted: boolean;
  runUpload: () => Promise<void>;
  uploadDone: boolean;
  hasPhotoAttachments: boolean;
  persistedCount: number;
  photoFetchStarted: boolean;
  uploadFatalError: string | null;
  runPhotoFetch: () => Promise<void>;
  isUploadInProgress: boolean;
  setClockMs: (value: number) => void;
  allPhasesComplete: boolean;
  hasUploadedTrees: boolean;
  completionModalShownRef: MutableRefObject<boolean>;
  total: number;
  partials: number;
  failures: number;
  rowAttentionSummaries: TreeUploadRowAttentionSummary[];
  photoFailureCount: number;
  treeManagerHref: string;
  treeManagerLabel: string;
  completionAnalyticsPayload: TreeUploadEventPayload;
  onComplete: () => void;
  pushModal: ModalController["pushModal"];
  show: ModalController["show"];
};

export function useUploadStepEffects({
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
  total,
  partials,
  failures,
  rowAttentionSummaries,
  photoFailureCount,
  treeManagerHref,
  treeManagerLabel,
  completionAnalyticsPayload,
  onComplete,
  pushModal,
  show,
}: UseUploadStepEffectsArgs) {
  useEffect(() => {
    if (validRows.length === 0 || uploadStarted || !siteSelection) {
      return;
    }

    persistPendingUpload({
      ownerDid: did,
      uploadId,
      validRows,
      previewSkippedRows,
      establishmentMeans,
      datasetSelection,
      siteSelection,
    });
  }, [
    datasetSelection,
    did,
    establishmentMeans,
    previewSkippedRows,
    siteSelection,
    uploadId,
    uploadStarted,
    validRows,
  ]);

  useEffect(() => {
    if (!uploadStarted) {
      void runUpload();
    }
  }, [runUpload, uploadStarted]);

  useEffect(() => {
    if (
      uploadDone &&
      hasPhotoAttachments &&
      persistedCount > 0 &&
      !photoFetchStarted &&
      !uploadFatalError
    ) {
      void runPhotoFetch();
    }
  }, [
    hasPhotoAttachments,
    persistedCount,
    photoFetchStarted,
    runPhotoFetch,
    uploadDone,
    uploadFatalError,
  ]);

  useEffect(() => {
    if (!isUploadInProgress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isUploadInProgress, setClockMs]);

  useEffect(() => {
    if (
      !allPhasesComplete ||
      uploadFatalError ||
      !hasUploadedTrees ||
      completionModalShownRef.current
    ) {
      return;
    }

    completionModalShownRef.current = true;
    trackTreeUploadFeedbackPromptShown(completionAnalyticsPayload);

    pushModal(
      {
        id: MODAL_IDS.UPLOAD_TREES_COMPLETE,
        content: (
          <TreeUploadCompleteModal
            totalCount={total}
            savedCount={persistedCount}
            partialCount={partials}
            failedCount={failures}
            rowAttentionSummaries={rowAttentionSummaries}
            photoFailureCount={photoFailureCount}
            treeManagerHref={treeManagerHref}
            treeManagerLabel={treeManagerLabel}
            analyticsPayload={completionAnalyticsPayload}
            onUploadMore={onComplete}
          />
        ),
        dialogWidth: "max-w-lg",
      },
      true,
    );
    void show();
  }, [
    allPhasesComplete,
    completionModalShownRef,
    completionAnalyticsPayload,
    failures,
    hasUploadedTrees,
    onComplete,
    partials,
    persistedCount,
    pushModal,
    photoFailureCount,
    rowAttentionSummaries,
    show,
    total,
    treeManagerHref,
    treeManagerLabel,
    uploadFatalError,
  ]);

  useEffect(() => {
    if (!isUploadInProgress) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isUploadInProgress]);
}
