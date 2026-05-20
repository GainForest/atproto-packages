import { describe, expect, test } from "bun:test";
import type { CertifiedLocation } from "@/graphql/indexer/queries/locations";
import {
  getBoundaryCapableUploadSites,
  isCertifiedLocationAtUri,
  shouldOfferCreateUploadSiteBoundary,
  toUploadSiteSelection,
  uploadSiteHasBoundary,
  uploadSiteHasTransientBoundary,
  type UploadSiteSelection,
} from "./site-selection";

const SITE_REF = "at://did:plc:test/app.certified.location/site-1";
const OTHER_SITE_REF = "at://did:plc:test/app.certified.location/site-2";

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

const UPLOAD_SITE_WITH_BOUNDARY: UploadSiteSelection = {
  uri: SITE_REF,
  rkey: "site-1",
  name: "Site 1",
  location: { uri: "https://example.com/site.geojson" },
  locationType: "geojson-point",
};

const UPLOAD_SITE_WITHOUT_BOUNDARY: UploadSiteSelection = {
  uri: OTHER_SITE_REF,
  rkey: "site-2",
  name: "Site 2",
  location: null,
  locationType: null,
};

const UPLOAD_SITE_WITH_TRANSIENT_BOUNDARY: UploadSiteSelection = {
  uri: "at://did:plc:test/app.certified.location/site-3",
  rkey: "site-3",
  name: "Site 3",
  location: { uri: "blob:http://localhost/drawn-polygon" },
  locationType: "geojson-point",
};

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

describe("tree upload site boundary creation helpers", () => {
  test("finds only sites with durable boundary URLs", () => {
    expect(uploadSiteHasBoundary(UPLOAD_SITE_WITH_TRANSIENT_BOUNDARY)).toBe(false);
    expect(uploadSiteHasTransientBoundary(UPLOAD_SITE_WITH_TRANSIENT_BOUNDARY)).toBe(true);
    expect(
      getBoundaryCapableUploadSites([
        UPLOAD_SITE_WITHOUT_BOUNDARY,
        UPLOAD_SITE_WITH_TRANSIENT_BOUNDARY,
        UPLOAD_SITE_WITH_BOUNDARY,
      ]),
    ).toEqual([UPLOAD_SITE_WITH_BOUNDARY]);
  });

  test("offers creation when there are no boundary-capable upload sites", () => {
    expect(
      shouldOfferCreateUploadSiteBoundary({
        sitesWithBoundary: [],
        selectedSite: null,
        selectedSiteBoundaryFailed: false,
      }),
    ).toBe(true);
  });

  test("does not offer creation while a usable boundary candidate exists", () => {
    expect(
      shouldOfferCreateUploadSiteBoundary({
        sitesWithBoundary: [UPLOAD_SITE_WITH_BOUNDARY],
        selectedSite: UPLOAD_SITE_WITH_BOUNDARY,
        selectedSiteBoundaryFailed: false,
      }),
    ).toBe(false);
  });

  test("offers creation when the only boundary-capable selected site fails validation", () => {
    expect(
      shouldOfferCreateUploadSiteBoundary({
        sitesWithBoundary: [UPLOAD_SITE_WITH_BOUNDARY],
        selectedSite: UPLOAD_SITE_WITH_BOUNDARY,
        selectedSiteBoundaryFailed: true,
      }),
    ).toBe(true);
  });

  test("does not offer creation for one failed site when another boundary candidate exists", () => {
    const otherBoundarySite: UploadSiteSelection = {
      ...UPLOAD_SITE_WITH_BOUNDARY,
      uri: OTHER_SITE_REF,
      rkey: "site-2",
      name: "Site 2",
    };

    expect(
      shouldOfferCreateUploadSiteBoundary({
        sitesWithBoundary: [UPLOAD_SITE_WITH_BOUNDARY, otherBoundarySite],
        selectedSite: UPLOAD_SITE_WITH_BOUNDARY,
        selectedSiteBoundaryFailed: true,
      }),
    ).toBe(false);
  });

  test("offers creation when every boundary candidate failed validation", () => {
    const otherBoundarySite: UploadSiteSelection = {
      ...UPLOAD_SITE_WITH_BOUNDARY,
      uri: OTHER_SITE_REF,
      rkey: "site-2",
      name: "Site 2",
    };

    expect(
      shouldOfferCreateUploadSiteBoundary({
        sitesWithBoundary: [UPLOAD_SITE_WITH_BOUNDARY, otherBoundarySite],
        selectedSite: UPLOAD_SITE_WITH_BOUNDARY,
        selectedSiteBoundaryFailed: true,
        allBoundaryCandidatesFailed: true,
      }),
    ).toBe(true);
  });
});
