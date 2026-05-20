import {
  getDatasetSiteContext,
  type DatasetSiteContext,
} from "./datasetSiteContext";

export const ALREADY_LINKED_DATASET_MESSAGE = "Already linked to this timeline";
export const CHECKING_LINKED_DATASETS_MESSAGE =
  "Checking existing timeline links…";
export const UNABLE_TO_VERIFY_LINKED_DATASETS_MESSAGE =
  "Unable to verify existing timeline links. Refresh to link tree datasets.";

type DatasetSelectionRow = {
  uri: string;
};

export function getTreeDatasetSelectionState(args: {
  uri: string;
  siteContext: DatasetSiteContext;
  linkedDatasetUris: ReadonlySet<string>;
  timelineAttachmentsLoading: boolean;
  timelineAttachmentsUnavailable: boolean;
}): { canSelect: boolean; disabledReason: string | null } {
  if (args.timelineAttachmentsLoading) {
    return {
      canSelect: false,
      disabledReason: CHECKING_LINKED_DATASETS_MESSAGE,
    };
  }

  if (args.timelineAttachmentsUnavailable) {
    return {
      canSelect: false,
      disabledReason: UNABLE_TO_VERIFY_LINKED_DATASETS_MESSAGE,
    };
  }

  if (args.linkedDatasetUris.has(args.uri)) {
    return {
      canSelect: false,
      disabledReason: ALREADY_LINKED_DATASET_MESSAGE,
    };
  }

  if (args.siteContext.status !== "ready") {
    return { canSelect: false, disabledReason: null };
  }

  return { canSelect: true, disabledReason: null };
}

export function buildSelectableTreeDatasetUris(args: {
  rows: DatasetSelectionRow[];
  siteContextsByDataset: Map<string, DatasetSiteContext>;
  linkedDatasetUris: ReadonlySet<string>;
  timelineAttachmentsLoading: boolean;
  timelineAttachmentsUnavailable: boolean;
}): Set<string> {
  const selectableUris = new Set<string>();

  for (const row of args.rows) {
    const siteContext = getDatasetSiteContext(
      args.siteContextsByDataset,
      row.uri,
    );
    const selectionState = getTreeDatasetSelectionState({
      uri: row.uri,
      siteContext,
      linkedDatasetUris: args.linkedDatasetUris,
      timelineAttachmentsLoading: args.timelineAttachmentsLoading,
      timelineAttachmentsUnavailable: args.timelineAttachmentsUnavailable,
    });

    if (selectionState.canSelect) {
      selectableUris.add(row.uri);
    }
  }

  return selectableUris;
}
