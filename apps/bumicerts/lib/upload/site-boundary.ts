import {
  classifyPointAgainstGeoJsonBoundary,
  validateGeojsonOrThrow,
} from "@gainforest/atproto-mutations-next/geojson";
import { extractSiteLocationUrl } from "@/lib/sites/location";
import type { UploadSiteSelection } from "./site-selection";
import type { ValidatedRow } from "./types";

export const TREE_SITE_NEAR_BOUNDARY_METERS = 15;

export type SiteBoundaryGeoJson = ReturnType<typeof validateGeojsonOrThrow>;

export type TreeBoundaryCoordinate = {
  index: number;
  scientificName: string | null;
  decimalLatitude: number;
  decimalLongitude: number;
};

export type TreeBoundaryFailure = {
  tree: TreeBoundaryCoordinate;
  kind: "near-boundary" | "out-of-site" | "invalid-boundary";
  distanceMeters: number;
  reason?: string;
};

export type UploadableBoundaryRow = {
  row: ValidatedRow;
  rowIndex: number;
};

export type SkippedBoundaryRow = {
  row: ValidatedRow;
  rowIndex: number;
  message: string;
};

export type UploadRowsSiteBoundaryCheck = {
  rowsToUpload: UploadableBoundaryRow[];
  skippedRows: SkippedBoundaryRow[];
  fatalError: string | null;
};

export function uploadSiteBoundaryQueryKey(siteUri: string | null | undefined) {
  return ["upload", "trees", "site-boundary", siteUri ?? null] as const;
}

function assertUsableSiteBoundary(
  boundary: SiteBoundaryGeoJson,
): SiteBoundaryGeoJson {
  const classification = classifyPointAgainstGeoJsonBoundary({
    geoJson: boundary,
    point: { lat: 0, lon: 0 },
    nearBoundaryMeters: 0,
  });

  if (classification.kind === "invalid-boundary") {
    throw new Error(
      `Selected site boundary must contain valid polygon GeoJSON. Redraw or re-upload the boundary GeoJSON before uploading tree data. ${classification.reason}`,
    );
  }

  return boundary;
}

export async function fetchUploadSiteBoundary(
  site: UploadSiteSelection,
): Promise<SiteBoundaryGeoJson> {
  const boundaryUrl = extractSiteLocationUrl(site.location);

  if (!boundaryUrl) {
    throw new Error(
      "Selected site does not include a GeoJSON boundary. Select another site or create, redraw, or re-upload a site boundary before uploading tree data.",
    );
  }

  const response = await fetch(boundaryUrl, { credentials: "same-origin" });

  if (!response.ok) {
    throw new Error(
      `Failed to load selected site boundary: HTTP ${response.status}. Select another site or redraw/re-upload the boundary GeoJSON before uploading tree data.`,
    );
  }

  const payload: unknown = await response.json();
  return assertUsableSiteBoundary(validateGeojsonOrThrow(payload));
}

export async function readGeoJsonFile(
  file: File,
): Promise<SiteBoundaryGeoJson> {
  const text = await file.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      "Boundary file must be valid GeoJSON JSON. Redraw or re-upload polygon GeoJSON before saving this site boundary.",
    );
  }

  try {
    return assertUsableSiteBoundary(validateGeojsonOrThrow(payload));
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(
      `Boundary file must contain valid polygon GeoJSON. Redraw or re-upload polygon GeoJSON before saving this site boundary.${detail}`,
    );
  }
}

export function getTreeBoundaryFailure(options: {
  tree: TreeBoundaryCoordinate;
  boundary: SiteBoundaryGeoJson;
  nearBoundaryMeters?: number;
}): TreeBoundaryFailure | null {
  const classification = classifyPointAgainstGeoJsonBoundary({
    geoJson: options.boundary,
    point: {
      lat: options.tree.decimalLatitude,
      lon: options.tree.decimalLongitude,
    },
    nearBoundaryMeters:
      options.nearBoundaryMeters ?? TREE_SITE_NEAR_BOUNDARY_METERS,
  });

  if (classification.kind === "inside") {
    return null;
  }

  if (classification.kind === "near-boundary") {
    return {
      tree: options.tree,
      kind: "near-boundary",
      distanceMeters: classification.distanceMeters,
    };
  }

  if (classification.kind === "outside") {
    return {
      tree: options.tree,
      kind: "out-of-site",
      distanceMeters: classification.distanceMeters,
    };
  }

  return {
    tree: options.tree,
    kind: "invalid-boundary",
    distanceMeters: Number.POSITIVE_INFINITY,
    reason: classification.reason,
  };
}

export function findTreeBoundaryFailures(options: {
  trees: TreeBoundaryCoordinate[];
  boundary: SiteBoundaryGeoJson;
  nearBoundaryMeters?: number;
}): TreeBoundaryFailure[] {
  return options.trees.flatMap((tree) => {
    const failure = getTreeBoundaryFailure({
      tree,
      boundary: options.boundary,
      nearBoundaryMeters: options.nearBoundaryMeters,
    });

    return failure ? [failure] : [];
  });
}

export function checkUploadRowsAgainstSelectedSite(options: {
  rows: ValidatedRow[];
  siteSelection: UploadSiteSelection;
  boundary: SiteBoundaryGeoJson;
}): UploadRowsSiteBoundaryCheck {
  const rowsToUpload: UploadableBoundaryRow[] = [];
  const skippedRows: SkippedBoundaryRow[] = [];

  for (let rowIndex = 0; rowIndex < options.rows.length; rowIndex += 1) {
    const row = options.rows[rowIndex];
    if (!row) {
      continue;
    }

    if (row.occurrence.siteRef !== options.siteSelection.uri) {
      skippedRows.push({
        row,
        rowIndex,
        message:
          "This row no longer matches the one selected site boundary for this upload. Go back and choose the correct site boundary, or restart the upload for the intended site; this row was skipped before upload.",
      });
      continue;
    }

    const failure = getTreeBoundaryFailure({
      tree: {
        index: row.index,
        scientificName: row.occurrence.scientificName,
        decimalLatitude: row.occurrence.decimalLatitude,
        decimalLongitude: row.occurrence.decimalLongitude,
      },
      boundary: options.boundary,
      nearBoundaryMeters: TREE_SITE_NEAR_BOUNDARY_METERS,
    });

    if (!failure) {
      rowsToUpload.push({ row, rowIndex });
      continue;
    }

    if (failure.kind === "invalid-boundary") {
      return {
        rowsToUpload: [],
        skippedRows: [],
        fatalError:
          "The selected site boundary can no longer be used because it is not valid polygon GeoJSON. Return to site selection and choose another site boundary, or redraw/re-upload/create a valid site boundary before uploading trees.",
      };
    }

    skippedRows.push({
      row,
      rowIndex,
      message:
        failure.kind === "near-boundary"
          ? `Near boundary: this tree is ${formatBoundaryDistance(failure.distanceMeters)} outside the selected site polygon. Fix the coordinates so the tree is inside the selected boundary, or go back and choose/create the correct site boundary; this row was skipped before upload.`
          : "Out of site: this tree is outside the selected site polygon. Fix the coordinates so the tree is inside the selected boundary, or go back and choose/create the correct site boundary; this row was skipped before upload.",
    });
  }

  return { rowsToUpload, skippedRows, fatalError: null };
}

export function formatBoundaryDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters)) {
    return "unknown distance";
  }

  if (distanceMeters < 1) {
    return `${Math.round(distanceMeters * 100)} cm`;
  }

  return `${distanceMeters.toFixed(1)} m`;
}
