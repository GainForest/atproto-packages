import { describe, expect, test } from "bun:test";
import type { OccurrenceItem } from "@/graphql/indexer/queries";
import {
  buildDatasetEvidenceStats,
  buildDatasetEvidenceStatsByUri,
  formatEvidenceDateRangeFromValues,
} from "./datasetStats";

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

describe("dataset evidence stats", () => {
  test("formats a recorded date range from evidence values", () => {
    expect(
      formatEvidenceDateRangeFromValues([
        "2024-04-15T12:00:00Z",
        "2024-06-01T12:00:00Z",
      ]),
    ).toBe("Apr 2024 – Jun 2024");
  });

  test("formats date-only January evidence values in UTC", () => {
    expect(formatEvidenceDateRangeFromValues(["2024-01-01"])).toBe("Jan 2024");
  });

  test("passes UTC timezone when formatting evidence ranges", () => {
    const original = Date.prototype.toLocaleDateString;
    const optionsSeen: Intl.DateTimeFormatOptions[] = [];

    Date.prototype.toLocaleDateString = function toLocaleDateString(
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ): string {
      if (options) {
        optionsSeen.push(options);
      }

      return original.call(this, locales, options);
    };

    try {
      formatEvidenceDateRangeFromValues(["2024-01-01", "2024-02-01"]);
    } finally {
      Date.prototype.toLocaleDateString = original;
    }

    expect(optionsSeen.every((options) => options.timeZone === "UTC")).toBe(true);
  });

  test("counts records and unique species", () => {
    const stats = buildDatasetEvidenceStats([
      occurrence({ scientificName: "Acacia", eventDate: "2024-04-15T12:00:00Z" }),
      occurrence({ scientificName: "acacia", eventDate: "2024-05-01T12:00:00Z" }),
      occurrence({ scientificName: "Ficus", eventDate: "2024-06-01T12:00:00Z" }),
    ]);

    expect(stats.recordCount).toBe(3);
    expect(stats.speciesCount).toBe(2);
    expect(stats.recordedDateRange).toBe("Apr 2024 – Jun 2024");
  });

  test("groups stats by dataset ref", () => {
    const statsByUri = buildDatasetEvidenceStatsByUri([
      occurrence({ datasetRef: "at://did:test/app.gainforest.dwc.dataset/ds-1" }),
      occurrence({ datasetRef: "at://did:test/app.gainforest.dwc.dataset/ds-1" }),
      occurrence({ datasetRef: "at://did:test/app.gainforest.dwc.dataset/ds-2" }),
    ]);

    expect(statsByUri.get("at://did:test/app.gainforest.dwc.dataset/ds-1")?.recordCount).toBe(2);
    expect(statsByUri.get("at://did:test/app.gainforest.dwc.dataset/ds-2")?.recordCount).toBe(1);
  });
});
