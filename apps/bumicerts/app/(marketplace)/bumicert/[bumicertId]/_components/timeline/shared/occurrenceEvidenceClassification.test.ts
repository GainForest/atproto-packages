import { describe, expect, test } from "bun:test";
import type { OccurrenceItem } from "@/graphql/indexer/queries";
import {
  getOccurrenceDatasetRef,
  isBiodiversityOccurrence,
  isMeasuredTreeOccurrence,
  isTreeDatasetOccurrence,
} from "./occurrenceEvidenceClassification";

function occurrence(overrides?: Partial<OccurrenceItem["record"]>): OccurrenceItem {
  return {
    metadata: {
      did: "did:test",
      uri: "at://did:test/app.gainforest.dwc.occurrence/occ-1",
      rkey: "occ-1",
      cid: "cid-occ-1",
      createdAt: null,
    },
    record: {
      scientificName: "Acacia",
      vernacularName: null,
      kingdom: null,
      individualCount: null,
      organismQuantity: null,
      eventDate: null,
      datasetName: null,
      decimalLatitude: null,
      decimalLongitude: null,
      recordedBy: null,
      country: null,
      countryCode: null,
      stateProvince: null,
      locality: null,
      occurrenceRemarks: null,
      habitat: null,
      basisOfRecord: null,
      dynamicProperties: null,
      establishmentMeans: null,
      datasetRef: null,
      siteRef: null,
      thumbnailUrl: null,
      speciesImageUrl: null,
      createdAt: null,
      ...overrides,
    },
  } satisfies OccurrenceItem;
}

describe("occurrence evidence classification", () => {
  test("detects measured tree occurrences", () => {
    const item = occurrence({
      dynamicProperties: JSON.stringify({ dataType: "measuredTree", source: "bumicerts" }),
    });

    expect(isMeasuredTreeOccurrence(item)).toBe(true);
    expect(isBiodiversityOccurrence(item)).toBe(false);
  });

  test("detects tree dataset occurrences", () => {
    const item = occurrence({
      datasetRef: "at://did:test/app.gainforest.dwc.dataset/ds-1",
      dynamicProperties: JSON.stringify({ dataType: "measuredTree" }),
    });

    expect(getOccurrenceDatasetRef(item)).toBe("at://did:test/app.gainforest.dwc.dataset/ds-1");
    expect(isTreeDatasetOccurrence(item)).toBe(true);
    expect(isBiodiversityOccurrence(item)).toBe(false);
  });

  test("excludes dataset-backed unmarked records from biodiversity", () => {
    expect(
      isBiodiversityOccurrence(
        occurrence({ datasetRef: "at://did:test/app.gainforest.dwc.dataset/ds-1" }),
      ),
    ).toBe(false);
  });

  test("detects biodiversity observations from supported external sources", () => {
    const item = occurrence({
      dynamicProperties: JSON.stringify({ source: "iNaturalist" }),
      kingdom: "Animalia",
    });

    expect(isBiodiversityOccurrence(item)).toBe(true);
  });
});
