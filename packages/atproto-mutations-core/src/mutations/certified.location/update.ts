import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  $parse,
} from "@gainforest/generated/app/certified/location.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError } from "../../blob/errors";
import { fromSerializableFile, isAnyBlobRef, normalizeBlobRef } from "../../blob/types";
import { fetchRecord, putRecord } from "../../utils/shared";
import { processGeoJsonFile } from "./utils/process-geojson";
import {
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
const MAX_SHAPEFILE_BYTES = 10 * 1024 * 1024; // 10 MB

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedLocationPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new CertifiedLocationValidationError({ message, cause, issues });

export const updateCertifiedLocation = (
  input: UpdateCertifiedLocationInput
): Effect.Effect<
  CertifiedLocationMutationResult,
  | CertifiedLocationValidationError
  | CertifiedLocationNotFoundError
  | CertifiedLocationPdsError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, newShapefile } = input;

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
      yield* processGeoJsonFile(newShapefile);
    }

    // 2. Fetch the existing record.
    const existing = yield* fetchRecord(
      COLLECTION, rkey, $parse, makePdsError
    );
    if (existing === null) {
      return yield* Effect.fail(new CertifiedLocationNotFoundError({ rkey }));
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

    // 4. Write back.
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
  GeoJsonValidationError,
  GeoJsonProcessingError,
  BlobUploadError,
};
