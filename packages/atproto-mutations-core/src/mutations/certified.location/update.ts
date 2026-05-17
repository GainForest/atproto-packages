import type { Agent } from "@atproto/api";
import { Effect } from "effect";
import type { GeoJsonObject } from "geojson";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  $parse,
} from "@gainforest/generated/app/certified/location.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError } from "../../blob/errors";
import { fromSerializableFile, isAnyBlobRef, normalizeBlobRef } from "../../blob/types";
import { fetchRecord, putRecord } from "../../utils/shared";
import {
  processGeoJsonObject,
  validateSerializableGeoJsonFile,
} from "./utils/process-geojson";
import { classifyPointAgainstGeoJsonBoundary } from "../../geojson/computations";
import {
  CertifiedLocationLinkedTreesConflictError,
  CertifiedLocationValidationError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
} from "./utils/errors";
import type {
  UpdateCertifiedLocationInput,
  CertifiedLocationMutationResult,
  CertifiedLocationRecord,
} from "./utils/types";
import { GeoJsonValidationError, GeoJsonProcessingError } from "../../geojson/errors";

const COLLECTION = "app.certified.location";
const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const MAX_SHAPEFILE_BYTES = 10 * 1024 * 1024; // 10 MB
const LIST_RECORDS_PAGE_LIMIT = 100;
const TREE_SITE_NEAR_BOUNDARY_METERS = 15;

type LinkedTreeBoundaryFailure = {
  scientificName: string | null;
  kind: "near-boundary" | "out-of-site";
  distanceMeters: number;
};

type LinkedTreeBoundaryCheckResult = {
  uncheckedCount: number;
  failures: LinkedTreeBoundaryFailure[];
  invalidBoundaryReason: string | null;
};

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedLocationPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new CertifiedLocationValidationError({ message, cause, issues });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value.trim())
      : Number.NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function getOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function checkLinkedTreesAgainstBoundary(options: {
  agent: Agent;
  siteUri: string;
  boundary: GeoJsonObject;
}): Promise<LinkedTreeBoundaryCheckResult> {
  const failures: LinkedTreeBoundaryFailure[] = [];
  let uncheckedCount = 0;
  let cursor: string | undefined;

  do {
    const response = await options.agent.com.atproto.repo.listRecords({
      repo: options.agent.assertDid,
      collection: OCCURRENCE_COLLECTION,
      limit: LIST_RECORDS_PAGE_LIMIT,
      cursor,
    });

    for (const record of response.data.records) {
      const value = record.value;
      if (!isRecord(value) || value.siteRef !== options.siteUri) {
        continue;
      }

      const decimalLatitude = parseCoordinate(value.decimalLatitude, -90, 90);
      const decimalLongitude = parseCoordinate(value.decimalLongitude, -180, 180);

      if (decimalLatitude === null || decimalLongitude === null) {
        uncheckedCount += 1;
        continue;
      }

      const classification = classifyPointAgainstGeoJsonBoundary({
        geoJson: options.boundary,
        point: { lat: decimalLatitude, lon: decimalLongitude },
        nearBoundaryMeters: TREE_SITE_NEAR_BOUNDARY_METERS,
      });

      if (classification.kind === "inside") {
        continue;
      }

      if (classification.kind === "invalid-boundary") {
        return {
          uncheckedCount,
          failures,
          invalidBoundaryReason: classification.reason,
        };
      }

      failures.push({
        scientificName: getOptionalString(value.scientificName),
        kind: classification.kind === "near-boundary" ? "near-boundary" : "out-of-site",
        distanceMeters: classification.distanceMeters,
      });
    }

    cursor = response.data.cursor;
  } while (cursor);

  return { uncheckedCount, failures, invalidBoundaryReason: null };
}

function formatBoundaryDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters)) {
    return "unknown distance";
  }

  if (distanceMeters < 1) {
    return `${Math.round(distanceMeters * 100)} cm`;
  }

  return `${distanceMeters.toFixed(1)} m`;
}

function buildLinkedTreesConflictMessage(result: LinkedTreeBoundaryCheckResult): string {
  if (result.uncheckedCount > 0) {
    return `${result.uncheckedCount} linked tree${result.uncheckedCount === 1 ? "" : "s"} could not be checked because coordinates are missing. Keep the existing boundary or fix those tree records first.`;
  }

  const sample = result.failures.slice(0, 3).map((failure, index) => {
    const treeLabel = failure.scientificName ?? `Tree ${index + 1}`;
    const issue = failure.kind === "near-boundary" ? "near boundary" : "out of site";
    return `${treeLabel} (${issue}, ${formatBoundaryDistance(failure.distanceMeters)})`;
  });

  return `This boundary would exclude ${result.failures.length} linked tree${result.failures.length === 1 ? "" : "s"}. Keep those trees inside the site before saving. ${sample.join("; ")}`;
}

export const updateCertifiedLocation = (
  input: UpdateCertifiedLocationInput
): Effect.Effect<
  CertifiedLocationMutationResult,
  | CertifiedLocationValidationError
  | CertifiedLocationNotFoundError
  | CertifiedLocationPdsError
  | CertifiedLocationLinkedTreesConflictError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, newShapefile } = input;
    let newBoundary: GeoJsonObject | null = null;

    // 1. Validate the new shapefile (if provided) before any PDS calls.
    //    This catches MIME/size/GeoJSON errors offline without spending bandwidth.
    if (newShapefile) {
      if (newShapefile.size > MAX_SHAPEFILE_BYTES) {
        return yield* Effect.fail(
          new GeoJsonValidationError({
            message: `GeoJSON file size ${newShapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES} B (10 MB)`,
          })
        );
      }
      newBoundary = yield* validateSerializableGeoJsonFile(newShapefile);
      yield* processGeoJsonObject(newBoundary);
    }

    // 2. Fetch the existing record.
    const existing = yield* fetchRecord(
      COLLECTION, rkey, $parse, makePdsError
    );
    if (existing === null) {
      return yield* Effect.fail(new CertifiedLocationNotFoundError({ rkey }));
    }

    if (newBoundary !== null) {
      const agent = yield* AtprotoAgent;
      const siteUri = `at://${agent.assertDid}/${COLLECTION}/${rkey}`;
      const linkedTreeBoundaryCheck = yield* Effect.tryPromise({
        try: () => checkLinkedTreesAgainstBoundary({
          agent,
          siteUri,
          boundary: newBoundary,
        }),
        catch: (cause) => makePdsError("Failed to verify linked trees against the new boundary.", cause),
      });

      if (linkedTreeBoundaryCheck.invalidBoundaryReason) {
        return yield* Effect.fail(
          new GeoJsonProcessingError({
            message: `GeoJSON boundary could not be used for tree validation. ${linkedTreeBoundaryCheck.invalidBoundaryReason}`,
          })
        );
      }

      if (
        linkedTreeBoundaryCheck.uncheckedCount > 0 ||
        linkedTreeBoundaryCheck.failures.length > 0
      ) {
        return yield* Effect.fail(
          new CertifiedLocationLinkedTreesConflictError({
            message: buildLinkedTreesConflictMessage(linkedTreeBoundaryCheck),
          })
        );
      }
    }

    // 3. Determine the location blob — new file or preserve existing.
    let locationBlob: { $type: string; blob: unknown };

    if (newShapefile) {
      const agent = yield* AtprotoAgent;
      const fileBytes = fromSerializableFile(newShapefile);
      const uploadResult = yield* Effect.tryPromise({
        try: () => agent.uploadBlob(fileBytes, { encoding: newShapefile.type }),
        catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause }),
      });
      const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
      locationBlob = {
        $type: "org.hypercerts.defs#smallBlob",
        blob: { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size },
      };
    } else {
      // Preserve the existing location blob.
      // The existing record's location blob may be a @atproto/lexicon class BlobRef —
      // normalize it so $parse accepts it.
      const existingLocation = existing.location as Record<string, unknown>;
      const normalizedBlob = isAnyBlobRef(existingLocation["blob"])
        ? normalizeBlobRef(existingLocation["blob"])
        : existingLocation["blob"];

      locationBlob = {
        $type: existingLocation["$type"] as string ?? "org.hypercerts.defs#smallBlob",
        blob: normalizedBlob,
      };
    }

    // 4. Build merged record (preserve createdAt, preserve lpVersion/srs/locationType).
    const merged = {
      $type: COLLECTION,
      lpVersion: existing.lpVersion,
      srs: existing.srs,
      locationType: existing.locationType,
      location: locationBlob,
      name: data.name !== undefined ? data.name : existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      createdAt: existing.createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(merged),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    // 5. Write back.
    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as CertifiedLocationRecord,
    } satisfies CertifiedLocationMutationResult;
  });

export {
  CertifiedLocationValidationError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationLinkedTreesConflictError,
  GeoJsonValidationError,
  GeoJsonProcessingError,
  BlobUploadError,
};
