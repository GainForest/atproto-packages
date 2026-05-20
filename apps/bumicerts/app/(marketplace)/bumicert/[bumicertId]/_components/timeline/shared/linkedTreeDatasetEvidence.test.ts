import { describe, expect, test } from "bun:test";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { getLinkedTreeDatasetUrisForActivity } from "./linkedTreeDatasetEvidence";

const currentActivity = {
  uri: "at://did:plc:org/org.hypercerts.claim.activity/activity-current",
  cid: "bafy-current-activity",
};
const otherActivity = {
  uri: "at://did:plc:org/org.hypercerts.claim.activity/activity-other",
  cid: "bafy-other-activity",
};
const currentActivityDatasetUri =
  "at://did:plc:org/app.gainforest.dwc.dataset/current-dataset";
const otherActivityDatasetUri =
  "at://did:plc:org/app.gainforest.dwc.dataset/other-dataset";

function makeAttachment(args: {
  activitySubject: { uri: string; cid: string };
  datasetUri: string;
  rkey: string;
}): AttachmentItem {
  return {
    metadata: {
      did: "did:plc:org",
      uri: `at://did:plc:org/org.hypercerts.context.attachment/${args.rkey}`,
      rkey: args.rkey,
      cid: `bafy-${args.rkey}`,
      createdAt: null,
      indexedAt: null,
    },
    creatorInfo: null,
    record: {
      title: "Attachment",
      shortDescription: null,
      description: null,
      contentType: "evidence",
      subjects: [args.activitySubject],
      content: [{ $type: "org.hypercerts.defs#uri", uri: args.datasetUri }],
      createdAt: null,
    },
  };
}

describe("linked tree dataset evidence", () => {
  test("only treats datasets linked to the current activity as existing links", () => {
    const linkedUris = getLinkedTreeDatasetUrisForActivity(
      [
        makeAttachment({
          activitySubject: currentActivity,
          datasetUri: currentActivityDatasetUri,
          rkey: "current-attachment",
        }),
        makeAttachment({
          activitySubject: otherActivity,
          datasetUri: otherActivityDatasetUri,
          rkey: "other-attachment",
        }),
      ],
      currentActivity.uri,
    );

    expect(linkedUris).toEqual(new Set([currentActivityDatasetUri]));
    expect(linkedUris.has(otherActivityDatasetUri)).toBe(false);
  });
});
