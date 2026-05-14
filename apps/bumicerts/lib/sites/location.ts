export type InlineSiteCoordinate = {
  lat: number;
  lon: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractSiteLocationUrl(location: unknown): string | null {
  if (!isRecord(location)) {
    return null;
  }

  if (location.$type === "app.certified.location#string") {
    return null;
  }

  if (typeof location.uri === "string") {
    return location.uri;
  }

  if (isRecord(location.blob) && typeof location.blob.uri === "string") {
    return location.blob.uri;
  }

  return null;
}

export function extractInlineSiteCoordinate(
  location: unknown,
  locationType: string | null | undefined,
): InlineSiteCoordinate | null {
  if (!isRecord(location)) {
    return null;
  }

  if (
    location.$type !== "app.certified.location#string" &&
    locationType !== "coordinate-decimal"
  ) {
    return null;
  }

  if (typeof location.string !== "string") {
    return null;
  }

  const parts = location.string.split(",");
  if (parts.length !== 2) {
    return null;
  }

  const [latRaw, lonRaw] = parts;
  if (latRaw === undefined || lonRaw === undefined) {
    return null;
  }

  const latText = latRaw.trim();
  const lonText = lonRaw.trim();
  if (latText.length === 0 || lonText.length === 0) {
    return null;
  }

  const lat = Number(latText);
  const lon = Number(lonText);

  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lon) ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  return { lat, lon };
}
