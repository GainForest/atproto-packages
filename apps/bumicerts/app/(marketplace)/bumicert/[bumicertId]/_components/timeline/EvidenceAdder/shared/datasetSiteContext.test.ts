import { describe, expect, test } from "bun:test";
import {
  buildDatasetSiteContexts,
  getDatasetSiteContext,
  groupDatasetUrisBySite,
} from "./datasetSiteContext";

const siteOne = {
  metadata: {
    uri: "at://did:plc:org/app.certified.location/site-1",
    cid: "bafy-site-1",
  },
  record: {
    name: "North plot",
  },
};
const siteTwo = {
  metadata: {
    uri: "at://did:plc:org/app.certified.location/site-2",
    cid: "bafy-site-2",
  },
  record: {
    name: "South plot",
  },
};

describe("dataset site context", () => {
  test("derives a strong site subject from dataset occurrences", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [
        { datasetUri: "at://did:plc:org/app.gainforest.dwc.dataset/ds-1", siteRef: siteOne.metadata.uri },
        { datasetUri: "at://did:plc:org/app.gainforest.dwc.dataset/ds-1", siteRef: siteOne.metadata.uri },
      ],
      locations: [siteOne],
    });

    expect(
      getDatasetSiteContext(
        contexts,
        "at://did:plc:org/app.gainforest.dwc.dataset/ds-1",
      ),
    ).toEqual({
      status: "ready",
      siteSubject: {
        uri: siteOne.metadata.uri,
        cid: siteOne.metadata.cid,
      },
      siteName: "North plot",
    });
  });

  test("marks a dataset with multiple site refs as mixed", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [
        { datasetUri: "dataset-1", siteRef: siteOne.metadata.uri },
        { datasetUri: "dataset-1", siteRef: siteTwo.metadata.uri },
      ],
      locations: [siteOne, siteTwo],
    });

    expect(getDatasetSiteContext(contexts, "dataset-1")).toEqual({
      status: "mixed-site-refs",
      siteRefs: [siteOne.metadata.uri, siteTwo.metadata.uri],
    });
  });

  test("marks datasets with no site refs as missing", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [{ datasetUri: "dataset-1", siteRef: null }],
      locations: [siteOne],
    });

    expect(getDatasetSiteContext(contexts, "dataset-1")).toEqual({
      status: "missing-site-ref",
    });
  });

  test("marks datasets with partial site refs as incomplete", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [
        { datasetUri: "dataset-1", siteRef: siteOne.metadata.uri },
        { datasetUri: "dataset-1", siteRef: null },
      ],
      locations: [siteOne],
    });

    expect(getDatasetSiteContext(contexts, "dataset-1")).toEqual({
      status: "incomplete-site-ref",
      siteRefs: [siteOne.metadata.uri],
    });
  });

  test("marks datasets with missing location records as unresolved", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [
        { datasetUri: "dataset-1", siteRef: siteOne.metadata.uri },
      ],
      locations: [],
    });

    expect(getDatasetSiteContext(contexts, "dataset-1")).toEqual({
      status: "unresolved-site",
      siteRef: siteOne.metadata.uri,
    });
  });

  test("groups selected dataset uris by resolved site", () => {
    const contexts = buildDatasetSiteContexts({
      occurrences: [
        { datasetUri: "dataset-1", siteRef: siteOne.metadata.uri },
        { datasetUri: "dataset-2", siteRef: siteOne.metadata.uri },
        { datasetUri: "dataset-3", siteRef: siteTwo.metadata.uri },
      ],
      locations: [siteOne, siteTwo],
    });

    expect(
      groupDatasetUrisBySite({
        datasetUris: ["dataset-1", "dataset-2", "dataset-3"],
        contexts,
      }),
    ).toEqual([
      {
        siteSubject: {
          uri: siteOne.metadata.uri,
          cid: siteOne.metadata.cid,
        },
        datasetUris: ["dataset-1", "dataset-2"],
      },
      {
        siteSubject: {
          uri: siteTwo.metadata.uri,
          cid: siteTwo.metadata.cid,
        },
        datasetUris: ["dataset-3"],
      },
    ]);
  });
});
