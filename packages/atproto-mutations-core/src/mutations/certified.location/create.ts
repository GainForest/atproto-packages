import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  $parse,
} from "@gainforest/generated/app/certified/location.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError } from "../../blob/errors";
import { fromSerializableFile } from "../../blob/types";
import { createRecord, fetchRecord } from "../../utils/shared";
import { processGeoJsonFile } from "./utils/process-geojson";
import {
  CertifiedLocationValidationError,
  CertifiedLocationPdsError,
} from "./utils/errors";
import type {
  CreateCertifiedLocationInput,
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

export const createCertifiedLocation = (
  input: CreateCertifiedLocationInput
): Effect.Effect<
  CertifiedLocationMutationResult,
  | CertifiedLocationValidationError
  | CertifiedLocationPdsError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { shapefile, name, description, rkey } = input;

    // 1. Validate file size before any processing.
    if (shapefile.size > MAX_SHAPEFILE_BYTES) {
      return yield* Effect.fail(
        new GeoJsonValidationError({
          message: `GeoJSON file size ${shapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES} B (10 MB)`,
        })
      );
    }

    // 2. Validate GeoJSON structure + compute polygon metrics.
    yield* processGeoJsonFile(shapefile);

    // 3. Upload the validated file as a blob.
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(shapefile);

    const uploadResult = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: shapefile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause }),
    });

    const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
    const blobRef = {
      $type: "blob" as const,
      ref: raw.ref,
      mimeType: raw.mimeType,
      size: raw.size,
    };

    // 4. Build and validate the record.
    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      lpVersion: "1.0.0",
      srs: "https://epsg.io/3857",
      locationType: "geojson-point",
      location: {
        $type: "org.hypercerts.defs#smallBlob",
        blob: blobRef,
      },
      name,
      description,
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    // 5. Write to the PDS.
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as CertifiedLocationRecord,
    } satisfies CertifiedLocationMutationResult;
  });

export {
  CertifiedLocationValidationError,
  CertifiedLocationPdsError,
  GeoJsonValidationError,
  GeoJsonProcessingError,
  BlobUploadError,
};
