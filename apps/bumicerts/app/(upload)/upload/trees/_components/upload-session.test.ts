import { describe, expect, test } from "bun:test";
import { parsePendingUploadData } from "./upload-session";

const OWNER_DID = "did:plc:testowner";
const SITE_REF = `at://${OWNER_DID}/app.certified.location/site-1`;

const VALID_PENDING_UPLOAD = {
  ownerDid: OWNER_DID,
  uploadId: "upload-1",
  validRows: [
    {
      index: 0,
      occurrence: {
        scientificName: "Shorea leprosula",
        eventDate: "2026-05-05",
        decimalLatitude: 9.75237,
        decimalLongitude: -4.635099,
        siteRef: SITE_REF,
      },
      floraMeasurement: null,
    },
  ],
  establishmentMeans: null,
  datasetSelection: { mode: "none" },
  siteSelection: {
    uri: SITE_REF,
    rkey: "site-1",
    name: "Site 1",
    location: { uri: "https://example.com/site.geojson" },
    locationType: "geojson-point",
  },
  timestamp: 1_000,
};

describe("parsePendingUploadData", () => {
  test("accepts a valid pending upload payload", () => {
    const parsed = parsePendingUploadData(
      VALID_PENDING_UPLOAD,
      OWNER_DID,
      2_000,
    );

    expect(parsed?.validRows).toHaveLength(1);
    expect(parsed?.siteSelection.uri).toBe(SITE_REF);
  });

  test("defaults missing preview skipped rows to an empty list", () => {
    const parsed = parsePendingUploadData(
      VALID_PENDING_UPLOAD,
      OWNER_DID,
      2_000,
    );

    expect(parsed?.previewSkippedRows).toEqual([]);
  });

  test("restores preview skipped row summaries", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        previewSkippedRows: [
          {
            sourceRowIndex: 4,
            rowLabel: "Dipterocarpus alatus",
            messages: [
              "Out of site: this tree is outside the selected site boundary and will be skipped.",
            ],
            kind: "skipped",
          },
        ],
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed?.previewSkippedRows).toHaveLength(1);
    expect(parsed?.previewSkippedRows[0]?.rowLabel).toBe(
      "Dipterocarpus alatus",
    );
  });

  test("rejects malformed preview skipped row summaries", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        previewSkippedRows: [
          {
            sourceRowIndex: 4,
            rowLabel: "Dipterocarpus alatus",
            messages: [],
            kind: "skipped",
          },
        ],
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects malformed restored rows", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        validRows: [
          {
            index: 0,
            occurrence: {
              scientificName: "Shorea leprosula",
              eventDate: "2026-05-05",
              decimalLatitude: "9.75237",
              decimalLongitude: -4.635099,
              siteRef: SITE_REF,
            },
            floraMeasurement: null,
          },
        ],
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects malformed selected site references", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        siteSelection: {
          ...VALID_PENDING_UPLOAD.siteSelection,
          uri: "not-an-at-uri",
        },
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects bare AT URI site selections", () => {
    const validRow = VALID_PENDING_UPLOAD.validRows[0];
    if (!validRow) {
      throw new Error("Expected test fixture row");
    }

    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        validRows: [
          {
            ...validRow,
            occurrence: {
              ...validRow.occurrence,
              siteRef: `at://${OWNER_DID}`,
            },
          },
        ],
        siteSelection: {
          ...VALID_PENDING_UPLOAD.siteSelection,
          uri: `at://${OWNER_DID}`,
        },
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects non-certified-location site selections", () => {
    const validRow = VALID_PENDING_UPLOAD.validRows[0];
    if (!validRow) {
      throw new Error("Expected test fixture row");
    }

    const wrongCollectionRef = `at://${OWNER_DID}/app.gainforest.dwc.occurrence/site-1`;
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        validRows: [
          {
            ...validRow,
            occurrence: {
              ...validRow.occurrence,
              siteRef: wrongCollectionRef,
            },
          },
        ],
        siteSelection: {
          ...VALID_PENDING_UPLOAD.siteSelection,
          uri: wrongCollectionRef,
        },
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects site selections whose URI rkey does not match metadata", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        siteSelection: {
          ...VALID_PENDING_UPLOAD.siteSelection,
          rkey: "other-site",
        },
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects selected sites without a boundary URL", () => {
    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        siteSelection: {
          ...VALID_PENDING_UPLOAD.siteSelection,
          location: { $type: "app.certified.location#string", string: "9,10" },
          locationType: "coordinate-decimal",
        },
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects rows that do not belong to the selected site", () => {
    const validRow = VALID_PENDING_UPLOAD.validRows[0];
    if (!validRow) {
      throw new Error("Expected test fixture row");
    }

    const parsed = parsePendingUploadData(
      {
        ...VALID_PENDING_UPLOAD,
        validRows: [
          {
            ...validRow,
            occurrence: {
              ...validRow.occurrence,
              siteRef: `at://${OWNER_DID}/app.certified.location/other-site`,
            },
          },
        ],
      },
      OWNER_DID,
      2_000,
    );

    expect(parsed).toBeNull();
  });

  test("rejects expired pending uploads", () => {
    const parsed = parsePendingUploadData(
      VALID_PENDING_UPLOAD,
      OWNER_DID,
      11 * 60 * 1_000,
    );

    expect(parsed).toBeNull();
  });
});
