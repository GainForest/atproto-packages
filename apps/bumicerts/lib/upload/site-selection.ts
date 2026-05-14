import { isAtUriString } from "@atproto/lex";
import type { CertifiedLocation } from "@/graphql/indexer/queries/locations";
import { extractSiteLocationUrl } from "@/lib/sites/location";

const CERTIFIED_LOCATION_COLLECTION = "app.certified.location";

export type UploadSiteSelection = {
  uri: string;
  rkey: string;
  name: string;
  location: unknown;
  locationType: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCertifiedLocationAtUriRkey(uri: string): string | null {
  if (!isAtUriString(uri)) {
    return null;
  }

  const match = /^at:\/\/[^/]+\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!match) {
    return null;
  }

  const [, collection, rkey] = match;
  return collection === CERTIFIED_LOCATION_COLLECTION ? rkey ?? null : null;
}

export function isCertifiedLocationAtUri(value: unknown): value is string {
  return typeof value === "string" && getCertifiedLocationAtUriRkey(value) !== null;
}

function isCertifiedLocationAtUriForRkey(
  uri: string,
  rkey: string,
): boolean {
  return getCertifiedLocationAtUriRkey(uri) === rkey;
}

export function toUploadSiteSelection(
  site: CertifiedLocation,
): UploadSiteSelection | null {
  const uri = site.metadata?.uri;
  const rkey = site.metadata?.rkey;

  if (!uri || !rkey || !isCertifiedLocationAtUriForRkey(uri, rkey)) {
    return null;
  }

  return {
    uri,
    rkey,
    name: site.record?.name?.trim() || "Unnamed site",
    location: site.record?.location ?? null,
    locationType: site.record?.locationType ?? null,
  };
}

export function uploadSiteHasBoundary(site: UploadSiteSelection): boolean {
  return extractSiteLocationUrl(site.location) !== null;
}

export function resolveUploadSiteSelection(options: {
  sites: UploadSiteSelection[];
  selectedSiteUri: string | null;
  defaultSiteUri: string | null | undefined;
}): UploadSiteSelection | null {
  const explicitlySelectedSite = options.selectedSiteUri
    ? options.sites.find((site) => site.uri === options.selectedSiteUri)
    : undefined;

  if (explicitlySelectedSite) {
    return explicitlySelectedSite;
  }

  if (options.selectedSiteUri !== null) {
    return null;
  }

  const defaultSite = options.defaultSiteUri
    ? options.sites.find((site) => site.uri === options.defaultSiteUri)
    : undefined;

  if (defaultSite) {
    return defaultSite;
  }

  if (options.sites.length === 1) {
    return options.sites[0] ?? null;
  }

  return null;
}

export function isUploadSiteSelection(
  value: unknown,
): value is UploadSiteSelection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.uri === "string" &&
    typeof value.rkey === "string" &&
    value.rkey.length > 0 &&
    isCertifiedLocationAtUriForRkey(value.uri, value.rkey) &&
    typeof value.name === "string" &&
    (typeof value.locationType === "string" || value.locationType === null) &&
    "location" in value
  );
}
