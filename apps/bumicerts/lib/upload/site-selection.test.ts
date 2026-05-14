import { describe, expect, test } from "bun:test";
import type { CertifiedLocation } from "@/graphql/indexer/queries/locations";
import { isCertifiedLocationAtUri, toUploadSiteSelection } from "./site-selection";

const SITE_REF = "at://did:plc:test/app.certified.location/site-1";

const BASE_SITE = {
  metadata: {
    did: "did:plc:test",
    uri: SITE_REF,
    rkey: "site-1",
    cid: "site-cid",
  },
  record: {
    name: " Site 1 ",
    description: null,
    location: { uri: "https://example.com/site.geojson" },
    locationType: "geojson-point",
  },
} satisfies CertifiedLocation;

describe("toUploadSiteSelection", () => {
  test("normalizes valid indexer locations for tree upload site selection", () => {
    const siteSelection = toUploadSiteSelection(BASE_SITE);

    expect(siteSelection?.uri).toBe(SITE_REF);
    expect(siteSelection?.name).toBe("Site 1");
  });

  test("rejects malformed indexer site refs", () => {
    const siteSelection = toUploadSiteSelection({
      ...BASE_SITE,
      metadata: {
        ...BASE_SITE.metadata,
        uri: "not-an-at-uri",
      },
    });

    expect(siteSelection).toBeNull();
  });

  test("rejects bare AT URIs without a certified location record path", () => {
    expect(isCertifiedLocationAtUri("at://did:plc:test")).toBe(false);
  });

  test("rejects AT URIs from other collections", () => {
    const siteSelection = toUploadSiteSelection({
      ...BASE_SITE,
      metadata: {
        ...BASE_SITE.metadata,
        uri: "at://did:plc:test/app.gainforest.dwc.occurrence/site-1",
      },
    });

    expect(siteSelection).toBeNull();
    expect(
      isCertifiedLocationAtUri(
        "at://did:plc:test/app.gainforest.dwc.occurrence/site-1",
      ),
    ).toBe(false);
  });

  test("rejects certified location URIs that do not match the metadata rkey", () => {
    const siteSelection = toUploadSiteSelection({
      ...BASE_SITE,
      metadata: {
        ...BASE_SITE.metadata,
        uri: "at://did:plc:test/app.certified.location/other-site",
      },
    });

    expect(siteSelection).toBeNull();
  });
});
