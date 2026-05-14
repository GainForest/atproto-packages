import { describe, expect, test } from "bun:test";
import { getTimelineEvidenceKind, matchesTimelineFilter } from "./evidenceKind";

describe("timeline evidence kind", () => {
  test("classifies managed content types", () => {
    expect(getTimelineEvidenceKind("tree-dataset", [])).toBe("tree");
    expect(getTimelineEvidenceKind("biodiversity", [])).toBe("biodiversity");
    expect(getTimelineEvidenceKind("audio", [])).toBe("audio");
  });

  test("preserves legacy site classification for location content", () => {
    expect(getTimelineEvidenceKind("location", [])).toBe("site");
  });

  test("classifies location attachment content as site evidence", () => {
    expect(
      getTimelineEvidenceKind(null, [
        {
          $type: "org.hypercerts.defs#uri",
          uri: "at://did:test/app.certified.location/site-1",
        },
      ]),
    ).toBe("site");
  });

  test("classifies dataset attachment content as tree evidence", () => {
    expect(
      getTimelineEvidenceKind(null, [
        {
          $type: "org.hypercerts.defs#uri",
          uri: "at://did:test/app.gainforest.dwc.dataset/ds-1",
        },
      ]),
    ).toBe("tree");
  });

  test("defaults unknown content to documents", () => {
    expect(getTimelineEvidenceKind(null, [])).toBe("document");
  });

  test("matches filters by kind", () => {
    expect(matchesTimelineFilter("tree", "all")).toBe(true);
    expect(matchesTimelineFilter("tree", "tree")).toBe(true);
    expect(matchesTimelineFilter("tree", "document")).toBe(false);
  });
});
