import { describe, expect, test } from "bun:test";
import { validateGeojsonOrThrow } from "@gainforest/atproto-mutations-next/geojson";
import { checkUploadRowsAgainstSelectedSite } from "./site-boundary";
import type { UploadSiteSelection } from "./site-selection";
import type { ValidatedRow } from "./types";

const SITE_REF = "at://did:plc:test/app.certified.location/site-1";
const OTHER_SITE_REF = "at://did:plc:test/app.certified.location/site-2";

const SITE_SELECTION: UploadSiteSelection = {
  uri: SITE_REF,
  rkey: "site-1",
  name: "Site 1",
  location: { uri: "https://example.com/site.geojson" },
  locationType: "geojson-point",
};

const SITE_BOUNDARY = validateGeojsonOrThrow({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-4.636, 9.752],
        [-4.635, 9.752],
        [-4.635, 9.753],
        [-4.636, 9.753],
        [-4.636, 9.752],
      ],
    ],
  },
});

function makeValidatedRow(overrides?: {
  index?: number;
  siteRef?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
}): ValidatedRow {
  return {
    index: overrides?.index ?? 0,
    occurrence: {
      scientificName: "Shorea leprosula",
      eventDate: "2026-05-05",
      decimalLatitude: overrides?.decimalLatitude ?? 9.75237,
      decimalLongitude: overrides?.decimalLongitude ?? -4.635099,
      basisOfRecord: "HumanObservation",
      siteRef: overrides?.siteRef ?? SITE_REF,
    },
    floraMeasurement: null,
  };
}

describe("checkUploadRowsAgainstSelectedSite", () => {
  test("accepts rows that still match the selected site boundary", () => {
    const result = checkUploadRowsAgainstSelectedSite({
      rows: [makeValidatedRow()],
      siteSelection: SITE_SELECTION,
      boundary: SITE_BOUNDARY,
    });

    expect(result.fatalError).toBeNull();
    expect(result.rowsToUpload.map((entry) => entry.rowIndex)).toEqual([0]);
    expect(result.skippedRows).toHaveLength(0);
  });

  test("keeps matching rows while skipping rows restored with a different siteRef", () => {
    const result = checkUploadRowsAgainstSelectedSite({
      rows: [
        makeValidatedRow({ index: 0 }),
        makeValidatedRow({ index: 1, siteRef: OTHER_SITE_REF }),
      ],
      siteSelection: SITE_SELECTION,
      boundary: SITE_BOUNDARY,
    });

    expect(result.fatalError).toBeNull();
    expect(result.rowsToUpload.map((entry) => entry.rowIndex)).toEqual([0]);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.skippedRows[0]?.message).toContain("selected site");
  });

  test("keeps matching rows while skipping rows that no longer fit the selected site boundary", () => {
    const result = checkUploadRowsAgainstSelectedSite({
      rows: [
        makeValidatedRow({ index: 0 }),
        makeValidatedRow({ index: 1, decimalLongitude: -4.63495 }),
        makeValidatedRow({ index: 2, decimalLongitude: -4.6345 }),
      ],
      siteSelection: SITE_SELECTION,
      boundary: SITE_BOUNDARY,
    });

    expect(result.fatalError).toBeNull();
    expect(result.rowsToUpload.map((entry) => entry.rowIndex)).toEqual([0]);
    expect(result.skippedRows).toHaveLength(2);
    expect(result.skippedRows[0]?.message).toContain("Near boundary");
    expect(result.skippedRows[1]?.message).toContain("Out of site");
  });
});
