import { describe, expect, test } from "bun:test";
import type {
  MeasurementItem,
  MultimediaItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import {
  mergeOptimisticMeasurements,
  mergeOptimisticMultimedia,
  mergeOptimisticOccurrences,
  reconcileOptimisticMeasurementRecords,
} from "./tree-manager-optimistic";

function createOccurrenceItem(
  overrides?: Partial<OccurrenceItem["record"]>,
): OccurrenceItem {
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
      individualCount: null,
      eventDate: "2024-01-01",
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
      establishmentMeans: null,
      datasetRef: null,
      createdAt: null,
      ...overrides,
    },
  };
}

function createMeasurementItem(
  rkey: string,
  occurrenceRef: string,
  result: unknown,
): MeasurementItem {
  return {
    metadata: {
      did: "did:test",
      uri: `at://did:test/app.gainforest.dwc.measurement/${rkey}`,
      rkey,
      cid: `cid-${rkey}`,
      createdAt: null,
    },
    record: {
      occurrenceRef,
      result,
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

function createMultimediaItem(
  rkey: string,
  occurrenceRef: string,
  accessUri: string,
): MultimediaItem {
  return {
    metadata: {
      did: "did:test",
      uri: `at://did:test/app.gainforest.ac.multimedia/${rkey}`,
      rkey,
      cid: `cid-${rkey}`,
      createdAt: null,
    },
    record: {
      occurrenceRef,
      siteRef: null,
      subjectPart: null,
      subjectPartUri: null,
      subjectOrientation: null,
      file: null,
      format: null,
      accessUri,
      variantLiteral: null,
      caption: null,
      creator: null,
      createDate: null,
      createdAt: null,
    },
  };
}

describe("mergeOptimisticOccurrences", () => {
  test("prefers optimistic records and excludes optimistically deleted trees", () => {
    const occurrence = createOccurrenceItem();
    const optimisticRecord = {
      ...occurrence.record,
      scientificName: "Albizia",
    };

    expect(
      mergeOptimisticOccurrences({
        occurrences: [occurrence],
        optimisticOccurrenceRecords: { "occ-1": optimisticRecord },
        optimisticDeletedOccurrenceRkeys: {},
      })[0]?.record.scientificName,
    ).toBe("Albizia");

    expect(
      mergeOptimisticOccurrences({
        occurrences: [occurrence],
        optimisticOccurrenceRecords: {},
        optimisticDeletedOccurrenceRkeys: { "occ-1": true },
      }),
    ).toHaveLength(0);
  });
});

describe("measurement optimistic helpers", () => {
  test("replaces server measurements for overridden occurrences", () => {
    const occurrenceRef = "at://did:test/app.gainforest.dwc.occurrence/occ-1";
    const serverMeasurement = createMeasurementItem("m-1", occurrenceRef, {
      value: "server",
    });
    const optimisticMeasurement = createMeasurementItem("m-2", occurrenceRef, {
      value: "optimistic",
    });

    expect(
      mergeOptimisticMeasurements({
        measurements: [serverMeasurement],
        optimisticMeasurementRecords: {
          [occurrenceRef]: [optimisticMeasurement],
        },
      }),
    ).toEqual([optimisticMeasurement]);
  });

  test("drops reconciled optimistic measurement sets once the server matches", () => {
    const occurrenceRef = "at://did:test/app.gainforest.dwc.occurrence/occ-1";
    const measurement = createMeasurementItem("m-1", occurrenceRef, {
      value: "synced",
    });

    expect(
      reconcileOptimisticMeasurementRecords({
        optimisticMeasurementRecords: { [occurrenceRef]: [measurement] },
        serverMeasurements: [measurement],
      }),
    ).toEqual({});
  });
});

describe("mergeOptimisticMultimedia", () => {
  test("combines optimistic additions, record overrides, and deleted photos", () => {
    const occurrenceRef = "at://did:test/app.gainforest.dwc.occurrence/occ-1";
    const deletedServerPhoto = createMultimediaItem(
      "photo-1",
      occurrenceRef,
      "https://example.com/old.jpg",
    );
    const optimisticPhoto = createMultimediaItem(
      "photo-2",
      occurrenceRef,
      "blob:preview",
    );
    const updatedServerPhoto = createMultimediaItem(
      "photo-3",
      occurrenceRef,
      "https://example.com/original.jpg",
    );

    const merged = mergeOptimisticMultimedia({
      multimedia: [deletedServerPhoto, updatedServerPhoto],
      optimisticAddedPhotos: { [occurrenceRef]: [optimisticPhoto] },
      optimisticDeletedPhotoRkeys: { "photo-1": true },
      optimisticMultimediaRecords: {
        "photo-3": {
          ...updatedServerPhoto.record,
          accessUri: "https://example.com/updated.jpg",
        },
      },
    });

    expect(merged.map((item) => item.metadata.rkey)).toEqual([
      "photo-2",
      "photo-3",
    ]);
    expect(merged[1]?.record.accessUri).toBe("https://example.com/updated.jpg");
  });
});
