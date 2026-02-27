import { Effect } from "effect";
import {
  $parse,
} from "@gainforest/generated/app/certified/location.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { BlobUploadError } from "../../blob/errors";
import { fromSerializableFile } from "../../blob/types";
import { fetchRecord, createRecord, putRecord } from "../../utils/shared";
import { processGeoJsonFile } from "./utils/process-geojson";
import {
  CertifiedLocationValidationError,
  CertifiedLocationPdsError,
} from "./utils/errors";
import type {
  UpsertCertifiedLocationInput,
  CertifiedLocationMutationResult,
  CertifiedLocationRecord,
} from "./utils/types";
import { GeoJsonValidationError, GeoJsonProcessingError } from "../../geojson/errors";

const COLLECTION = "app.certified.location";
const MAX_SHAPEFILE_BYTES = 10 * 1024 * 1024; // 10 MB

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedLocationPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new CertifiedLocationValidationError({ message, cause });

/**
 * Upsert a certified.location record.
 *
 * - When `rkey` is omitted: always creates a new record.
 * - When `rkey` is provided: updates if found, creates (at that rkey) if not found.
 *
 * Returns `{ created: true }` when a new record was written, `false` when an
 * existing record was replaced.
 */
export const upsertCertifiedLocation = (
  input: UpsertCertifiedLocationInput
): Effect.Effect<
  CertifiedLocationMutationResult & { created: boolean },
  | CertifiedLocationValidationError
  | CertifiedLocationPdsError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { shapefile, name, description, rkey } = input;

    // 1. Validate file size.
    if (shapefile.size > MAX_SHAPEFILE_BYTES) {
      return yield* Effect.fail(
        new GeoJsonValidationError({
          message: `GeoJSON file size ${shapefile.size} B exceeds maximum ${MAX_SHAPEFILE_BYTES} B (10 MB)`,
        })
      );
    }

    // 2. Validate GeoJSON + compute metrics.
    yield* processGeoJsonFile(shapefile);

    // 3. Check for existing record if rkey is given.
    let existing: CertifiedLocationRecord | null = null;
    if (rkey) {
      existing = yield* fetchRecord<CertifiedLocationRecord, CertifiedLocationPdsError>(
        COLLECTION, rkey, makePdsError
      );
    }

    // 4. Upload the validated file.
    const agent = yield* AtprotoAgent;
    const fileBytes = fromSerializableFile(shapefile);
    const uploadResult = yield* Effect.tryPromise({
      try: () => agent.uploadBlob(fileBytes, { encoding: shapefile.type }),
      catch: (cause) => new BlobUploadError({ message: "Failed to upload GeoJSON blob", cause }),
    });
    const raw = uploadResult.data.blob as { ref: unknown; mimeType: string; size: number };
    const blobRef = { $type: "blob" as const, ref: raw.ref, mimeType: raw.mimeType, size: raw.size };

    // 5. Build the candidate record.
    const createdAt = existing !== null
      ? existing.createdAt
      : new Date().toISOString();

    const candidate = {
      $type: COLLECTION,
      lpVersion: "1.0.0",
      srs: "https://epsg.io/3857",
      locationType: "geojson-point",
      location: { $type: "org.hypercerts.defs#smallBlob", blob: blobRef },
      name,
      description,
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => makeValidationError(`certified.location record failed lexicon validation: ${String(cause)}`, cause),
    });

    // 6. Write to PDS.
    const isCreate = !rkey || existing === null;
    let uri: string;
    let cid: string;
    let assignedRkey: string;

    if (isCreate) {
      const result = yield* createRecord(COLLECTION, record, rkey, makePdsError);
      uri = result.uri;
      cid = result.cid;
      assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";
    } else {
      const result = yield* putRecord(COLLECTION, rkey!, record, makePdsError);
      uri = result.uri;
      cid = result.cid;
      assignedRkey = rkey!;
    }

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as CertifiedLocationRecord,
      created: isCreate,
    };
  });

export {
  CertifiedLocationValidationError,
  CertifiedLocationPdsError,
  GeoJsonValidationError,
  GeoJsonProcessingError,
  BlobUploadError,
};
