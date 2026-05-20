import { describe, expect, test } from "bun:test";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import type { ResolvedAttachmentReference } from "./referenceResolution/referenceViewModel";
import { getTimelineMapLayerState } from "./timelineMapLayerState";
import { buildTimelineMapLayers, type TimelineMapLayer } from "./timelineMapLayers";

const activitySubject = {
  uri: "at://did:plc:org/org.hypercerts.claim.activity/activity-1",
  cid: "bafy-activity",
};
const siteSubject = {
  uri: "at://did:plc:org/app.certified.location/site-1",
  cid: "bafy-site",
};

function makeAttachment(): AttachmentItem {
  return {
    metadata: {
      did: "did:plc:org",
      uri: "at://did:plc:org/org.hypercerts.context.attachment/att-1",
      rkey: "att-1",
      cid: "bafy-att",
      createdAt: null,
      indexedAt: null,
    },
    creatorInfo: null,
    record: {
      title: "Tree evidence",
      shortDescription: null,
      description: null,
      contentType: "tree-dataset",
      subjects: [activitySubject, siteSubject],
      content: [],
      createdAt: null,
    },
  };
}

function makeDatasetReference(
  id: string,
  title: string,
): ResolvedAttachmentReference {
  return {
    id,
    kind: "dataset",
    title,
    description: "10 records",
    datasetRef: id,
  };
}

describe("timeline map layers", () => {
  test("builds dataset layers with contextual site refs", () => {
    const datasetUri = "at://did:plc:org/app.gainforest.dwc.dataset/dataset-1";

    expect(
      buildTimelineMapLayers([
        {
          item: makeAttachment(),
          references: [makeDatasetReference(datasetUri, "Tree dataset")],
        },
      ]),
    ).toEqual([
      {
        datasetUri,
        title: "Tree dataset",
        description: "10 records",
        siteRef: siteSubject,
      },
    ]);
  });

  test("dedupes repeated dataset layers", () => {
    const datasetUri = "at://did:plc:org/app.gainforest.dwc.dataset/dataset-1";

    expect(
      buildTimelineMapLayers([
        {
          item: makeAttachment(),
          references: [
            makeDatasetReference(datasetUri, "Tree dataset"),
            makeDatasetReference(datasetUri, "Tree dataset duplicate"),
          ],
        },
      ]),
    ).toHaveLength(1);
  });

  test("summarizes active and hidden map layer state", () => {
    const activeUri = "at://did:plc:org/app.gainforest.dwc.dataset/active";
    const hiddenUri = "at://did:plc:org/app.gainforest.dwc.dataset/hidden";
    const layers: TimelineMapLayer[] = [
      {
        datasetUri: activeUri,
        title: "Active trees",
        siteRef: null,
      },
      {
        datasetUri: hiddenUri,
        title: "Hidden trees",
        siteRef: null,
      },
    ];

    const state = getTimelineMapLayerState(layers, { [activeUri]: true });

    expect(state.summaryLabel).toBe("1 active · 1 hidden");
    expect(state.activeLayers.map((layer) => layer.datasetUri)).toEqual([
      activeUri,
    ]);
    expect(state.hiddenLayers.map((layer) => layer.datasetUri)).toEqual([
      hiddenUri,
    ]);
  });
});
