import { describe, expect, test } from "bun:test";
import {
  buildPreviewRowAttentionSummaries,
  createTreeUploadRowAttentionSummary,
  getTreeUploadRowAttentionKindLabel,
  getValidatedRowLabel,
} from "./row-attention";
import type { RowError, ValidatedRow } from "./types";

describe("tree upload row attention summaries", () => {
  test("builds preview skipped summaries with original row numbers and messages", () => {
    const errors: RowError[] = [
      {
        index: 2,
        issues: [
          {
            path: "siteBoundary",
            message:
              "Near boundary: this tree is 3.2 m outside the selected site and will be skipped.",
          },
        ],
      },
    ];

    const summaries = buildPreviewRowAttentionSummaries(errors, [
      { scientificName: "Shorea leprosula" },
      { scientificName: "Hopea odorata" },
      { scientificName: "Dipterocarpus alatus" },
    ]);

    expect(summaries).toEqual([
      {
        sourceRowIndex: 2,
        rowLabel: "Dipterocarpus alatus",
        messages: [
          "Near boundary: this tree is 3.2 m outside the selected site and will be skipped.",
        ],
        kind: "skipped",
      },
    ]);
  });

  test("uses safe fallbacks for empty labels and messages", () => {
    const summary = createTreeUploadRowAttentionSummary({
      sourceRowIndex: 4,
      rowLabel: " ",
      messages: [""],
      kind: "failed",
    });

    expect(summary).toEqual({
      sourceRowIndex: 4,
      rowLabel: "Row 5",
      messages: ["This row needs review."],
      kind: "failed",
    });
  });

  test("labels validated rows and attention kinds", () => {
    const row: ValidatedRow = {
      index: 6,
      occurrence: {
        scientificName: " ",
        eventDate: "2026-05-05",
        decimalLatitude: 9.75237,
        decimalLongitude: -4.635099,
      },
      floraMeasurement: null,
    };

    expect(getValidatedRowLabel(row)).toBe("Row 7");
    expect(getTreeUploadRowAttentionKindLabel("skipped")).toBe("Skipped");
    expect(getTreeUploadRowAttentionKindLabel("partial")).toBe(
      "Needs follow-up",
    );
    expect(getTreeUploadRowAttentionKindLabel("failed")).toBe("Failed");
  });
});
