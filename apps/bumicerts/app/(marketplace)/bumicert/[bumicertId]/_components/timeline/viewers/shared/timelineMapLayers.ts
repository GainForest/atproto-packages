import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { getAttachmentContextSubject } from "../../shared/attachmentSubjects";
import { parseAtUri } from "./referenceResolution/atUri";
import type { ResolvedAttachmentReference } from "./referenceResolution/referenceViewModel";

export type TimelineMapLayer = {
  datasetUri: string;
  title: string;
  description?: string;
  siteRef: {
    uri: string;
    cid: string;
  } | null;
};

type TimelineMapLayerEntry = {
  item: AttachmentItem;
  references: ResolvedAttachmentReference[];
};

function isDatasetAtUri(uri: string): boolean {
  return parseAtUri(uri)?.collection === "app.gainforest.dwc.dataset";
}

export function buildTimelineMapLayers(
  entries: TimelineMapLayerEntry[],
): TimelineMapLayer[] {
  const seenDatasetUris = new Set<string>();
  const layers: TimelineMapLayer[] = [];

  for (const entry of entries) {
    const siteRef = getAttachmentContextSubject(entry.item.record?.subjects);

    for (const reference of entry.references) {
      const datasetUri = reference.datasetRef ?? reference.id;
      if (reference.kind !== "dataset" || !isDatasetAtUri(datasetUri)) {
        continue;
      }

      if (seenDatasetUris.has(datasetUri)) {
        continue;
      }

      seenDatasetUris.add(datasetUri);
      layers.push({
        datasetUri,
        title: reference.title,
        description: reference.description,
        siteRef,
      });
    }
  }

  return layers;
}
