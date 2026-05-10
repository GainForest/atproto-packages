"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { ValidatedRow } from "@/lib/upload/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { TreeUploadCompleteModal } from "./TreeUploadCompleteModal";
import { persistPendingUpload } from "./upload-session";
import type { UploadDatasetSelection } from "@/lib/upload/upload-dataset-selection";

type ModalController = ReturnType<
  (typeof import("@/components/ui/modal/context"))["useModal"]
>;

type UseUploadStepEffectsArgs = {
  did: string;
  validRows: ValidatedRow[];
  establishmentMeans: string | null;
  datasetSelection: UploadDatasetSelection;
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
  photoFailureCount: number;
  treeManagerHref: string;
  treeManagerLabel: string;
  onComplete: () => void;
  pushModal: ModalController["pushModal"];
  show: ModalController["show"];
};

export function useUploadStepEffects({
  did,
  validRows,
  establishmentMeans,
  datasetSelection,
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
  photoFailureCount,
  treeManagerHref,
  treeManagerLabel,
  onComplete,
  pushModal,
  show,
}: UseUploadStepEffectsArgs) {
  useEffect(() => {
    if (validRows.length === 0 || uploadStarted) {
      return;
    }

    persistPendingUpload({
      ownerDid: did,
      validRows,
      establishmentMeans,
      datasetSelection,
    });
  }, [datasetSelection, did, establishmentMeans, uploadStarted, validRows]);

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

    pushModal(
      {
        id: MODAL_IDS.UPLOAD_TREES_COMPLETE,
        content: (
          <TreeUploadCompleteModal
            totalCount={total}
            savedCount={persistedCount}
            partialCount={partials}
            failedCount={failures}
            photoFailureCount={photoFailureCount}
            treeManagerHref={treeManagerHref}
            treeManagerLabel={treeManagerLabel}
            onUploadMore={onComplete}
          />
        ),
        dialogWidth: "max-w-md",
      },
      true,
    );
    void show();
  }, [
    allPhasesComplete,
    completionModalShownRef,
    failures,
    hasUploadedTrees,
    onComplete,
    partials,
    persistedCount,
    pushModal,
    photoFailureCount,
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
