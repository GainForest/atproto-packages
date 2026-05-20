import { describe, expect, test } from "bun:test";
import type { DatasetSiteContext } from "./datasetSiteContext";
import {
  ALREADY_LINKED_DATASET_MESSAGE,
  CHECKING_LINKED_DATASETS_MESSAGE,
  UNABLE_TO_VERIFY_LINKED_DATASETS_MESSAGE,
  buildSelectableTreeDatasetUris,
  getTreeDatasetSelectionState,
} from "./datasetEvidenceSelection";

const datasetUri = "at://did:plc:org/app.gainforest.dwc.dataset/dataset-1";
const otherDatasetUri =
  "at://did:plc:org/app.gainforest.dwc.dataset/dataset-2";

const readyContext: DatasetSiteContext = {
  status: "ready",
  siteName: "Forest site",
  siteSubject: {
    uri: "at://did:plc:org/app.certified.location/site-1",
    cid: "bafy-site",
  },
};

describe("dataset evidence selection", () => {
  test("removes already-linked tree datasets from selectable URIs", () => {
    const siteContextsByDataset = new Map<string, DatasetSiteContext>([
      [datasetUri, readyContext],
      [otherDatasetUri, readyContext],
    ]);

    expect(
      buildSelectableTreeDatasetUris({
        rows: [{ uri: datasetUri }, { uri: otherDatasetUri }],
        siteContextsByDataset,
        linkedDatasetUris: new Set([datasetUri]),
        timelineAttachmentsLoading: false,
        timelineAttachmentsUnavailable: false,
      }),
    ).toEqual(new Set([otherDatasetUri]));

    expect(
      buildSelectableTreeDatasetUris({
        rows: [{ uri: datasetUri }, { uri: otherDatasetUri }],
        siteContextsByDataset,
        linkedDatasetUris: new Set(),
        timelineAttachmentsLoading: true,
        timelineAttachmentsUnavailable: false,
      }),
    ).toEqual(new Set());

    expect(
      buildSelectableTreeDatasetUris({
        rows: [{ uri: datasetUri }, { uri: otherDatasetUri }],
        siteContextsByDataset,
        linkedDatasetUris: new Set(),
        timelineAttachmentsLoading: false,
        timelineAttachmentsUnavailable: true,
      }),
    ).toEqual(new Set());
  });

  test("explains already-linked, loading, and unavailable disabled states", () => {
    expect(
      getTreeDatasetSelectionState({
        uri: datasetUri,
        siteContext: readyContext,
        linkedDatasetUris: new Set([datasetUri]),
        timelineAttachmentsLoading: false,
        timelineAttachmentsUnavailable: false,
      }),
    ).toEqual({
      canSelect: false,
      disabledReason: ALREADY_LINKED_DATASET_MESSAGE,
    });

    expect(
      getTreeDatasetSelectionState({
        uri: datasetUri,
        siteContext: readyContext,
        linkedDatasetUris: new Set(),
        timelineAttachmentsLoading: true,
        timelineAttachmentsUnavailable: false,
      }),
    ).toEqual({
      canSelect: false,
      disabledReason: CHECKING_LINKED_DATASETS_MESSAGE,
    });

    expect(
      getTreeDatasetSelectionState({
        uri: datasetUri,
        siteContext: readyContext,
        linkedDatasetUris: new Set(),
        timelineAttachmentsLoading: false,
        timelineAttachmentsUnavailable: true,
      }),
    ).toEqual({
      canSelect: false,
      disabledReason: UNABLE_TO_VERIFY_LINKED_DATASETS_MESSAGE,
    });
  });
});
