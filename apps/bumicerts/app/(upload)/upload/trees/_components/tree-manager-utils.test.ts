import { describe, expect, test } from "bun:test";
import type {
  MeasurementItem,
  MultimediaItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import {
  capCanopyCoverPercentInput,
  getTreeDeletionTarget,
  validateMeasurementDraft,
  type TreeManagerItem,
  type TreeMeasurementDraft,
} from "./tree-manager-utils";

const EMPTY_MEASUREMENT_DRAFT: TreeMeasurementDraft = {
  dbh: "",
  totalHeight: "",
  diameter: "",
  canopyCoverPercent: "",
};

function draftWithCanopyCover(value: string): TreeMeasurementDraft {
  return {
    ...EMPTY_MEASUREMENT_DRAFT,
    canopyCoverPercent: value,
  };
}

function createOccurrenceItem(): OccurrenceItem {
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
      eventDate: "2024-01-01",
      datasetName: null,
      decimalLatitude: "1",
      decimalLongitude: "2",
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
    },
  };
}

function createMeasurementItem(rkey: string): MeasurementItem {
  return {
    metadata: {
      did: "did:test",
      uri: `at://did:test/app.gainforest.dwc.measurement/${rkey}`,
      rkey,
      cid: `cid-${rkey}`,
      createdAt: null,
    },
    record: {
      occurrenceRef: "at://did:test/app.gainforest.dwc.occurrence/occ-1",
      result: null,
      measuredBy: null,
      measuredByID: null,
      measurementDate: null,
      measurementMethod: null,
      measurementRemarks: null,
      createdAt: null,
      legacyMeasurementType: null,
      legacyMeasurementValue: null,
      legacyMeasurementUnit: null,
      schemaVersion: "bundled",
    },
  };
}

function createPhotoItem(rkey: string): MultimediaItem {
  return {
    metadata: {
      did: "did:test",
      uri: `at://did:test/app.gainforest.ac.multimedia/${rkey}`,
      rkey,
      cid: `cid-${rkey}`,
      createdAt: null,
    },
    record: {
      occurrenceRef: "at://did:test/app.gainforest.dwc.occurrence/occ-1",
      siteRef: null,
      subjectPart: null,
      subjectPartUri: null,
      subjectOrientation: null,
      file: null,
      format: null,
      accessUri: null,
      variantLiteral: null,
      caption: null,
      creator: null,
      createDate: null,
      createdAt: null,
    },
  };
}

function createTreeManagerItem(options?: {
  measurements?: MeasurementItem[];
  photos?: MultimediaItem[];
}): TreeManagerItem {
  const measurements = options?.measurements ?? [];
  return {
    occurrence: createOccurrenceItem(),
    measurements,
    bundledMeasurements: measurements,
    preferredMeasurement: measurements[0] ?? null,
    floraMeasurement: null,
    photos: options?.photos ?? [],
    hasLegacyMeasurements: false,
    hasUnsupportedMeasurements: false,
    hasDuplicateBundledMeasurements: false,
  };
}

describe("capCanopyCoverPercentInput", () => {
  test("keeps canopy cover values from 0 through 100 unchanged", () => {
    expect(capCanopyCoverPercentInput("")).toBe("");
    expect(capCanopyCoverPercentInput("0")).toBe("0");
    expect(capCanopyCoverPercentInput("50")).toBe("50");
    expect(capCanopyCoverPercentInput("99.5")).toBe("99.5");
    expect(capCanopyCoverPercentInput("100")).toBe("100");
  });

  test("caps finite canopy cover values above 100", () => {
    expect(capCanopyCoverPercentInput("100.1")).toBe("100");
    expect(capCanopyCoverPercentInput("101")).toBe("100");
    expect(capCanopyCoverPercentInput("250")).toBe("100");
  });

  test("leaves invalid numeric input for validation to report", () => {
    expect(capCanopyCoverPercentInput("abc")).toBe("abc");
  });
});

describe("getTreeDeletionTarget", () => {
  test("collects occurrence and linked record rkeys for cascading deletion", () => {
    const target = getTreeDeletionTarget(
      createTreeManagerItem({
        measurements: [
          createMeasurementItem("measurement-1"),
          createMeasurementItem("measurement-2"),
        ],
        photos: [createPhotoItem("photo-1")],
      }),
    );

    expect(target).toEqual({
      occurrenceRkey: "occ-1",
      occurrenceUri: "at://did:test/app.gainforest.dwc.occurrence/occ-1",
      measurementCount: 2,
      photoCount: 1,
    });
  });

  test("counts linked children without requiring indexed child rkeys", () => {
    const target = getTreeDeletionTarget(
      createTreeManagerItem({
        measurements: [
          createMeasurementItem("measurement-1"),
          createMeasurementItem(""),
        ],
        photos: [createPhotoItem(""), createPhotoItem("photo-1")],
      }),
    );

    expect(target?.measurementCount).toBe(2);
    expect(target?.photoCount).toBe(2);
  });
});

describe("validateMeasurementDraft", () => {
  test("accepts canopy cover values from 0 through 100", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("0"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("50"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("99.5"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("100"))).toBeNull();
  });

  test("rejects canopy cover values above 100", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("100.1"))).toBe(
      "Canopy cover must be a number less than or equal to 100.",
    );
    expect(validateMeasurementDraft(draftWithCanopyCover("101"))).toBe(
      "Canopy cover must be a number less than or equal to 100.",
    );
  });

  test("rejects negative and non-numeric canopy cover values", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("-0.1"))).toBe(
      "Canopy cover must be a number greater than or equal to 0.",
    );
    expect(validateMeasurementDraft(draftWithCanopyCover("abc"))).toBe(
      "Canopy cover must be a valid number.",
    );
  });
});
