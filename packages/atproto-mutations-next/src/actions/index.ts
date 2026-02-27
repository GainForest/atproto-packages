"use server";

// @gainforest/atproto-mutations-next/actions
//
// Raw server actions — every function here returns MutationResult<TData, TCode>
// and never throws domain errors.
//
// USE THIS when:
//   - Calling one server action from another (server-to-server composition)
//   - You need access to the full Result shape (e.g. mapping errors upward)
//
// DO NOT use this in client components directly — import from ./client instead,
// which ships the adapt()-wrapped mutations namespace.
//
// Example — server-to-server (e.g. post-signup org setup):
//
//   import { createOrganizationInfoAction, upsertOrganizationInfoAction }
//     from "@gainforest/atproto-mutations-next/actions";
//
//   export async function signup(input: SignupInput, agentLayer: Layer) {
//     const userResult = await createUserAction(input);
//     if (!userResult.success) return userResult;
//
//     const orgResult = await upsertOrganizationInfoAction(orgInput, agentLayer);
//     if (!orgResult.success) return orgResult;
//
//     return ok(userResult.data);
//   }

import { Effect } from "effect";
import type { Layer } from "effect";
import {
  createOrganizationInfo,
  updateOrganizationInfo,
  upsertOrganizationInfo,
  createClaimActivity,
  updateClaimActivity,
  upsertClaimActivity,
  deleteClaimActivity,
  uploadBlob,
  ok,
  err,
  AtprotoAgent,
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  ClaimActivityValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  FileConstraintError,
  BlobUploadError,
  GeoJsonValidationError,
  GeoJsonProcessingError,
  createCertifiedLocation,
  updateCertifiedLocation,
  upsertCertifiedLocation,
  deleteCertifiedLocation,
  CertifiedLocationValidationError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationIsDefaultError,
  setDefaultSite,
  DefaultSiteValidationError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
  createLayer,
  updateLayer,
  upsertLayer,
  deleteLayer,
  LayerValidationError,
  LayerNotFoundError,
  LayerPdsError,
  createAudioRecording,
  updateAudioRecording,
  upsertAudioRecording,
  deleteAudioRecording,
  AudioRecordingValidationError,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
} from "@gainforest/atproto-mutations-core";
import type {
  MutationResult,
  CreateOrganizationInfoInput,
  UpdateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  CreateClaimActivityInput,
  UpdateClaimActivityInput,
  UpsertClaimActivityInput,
  ClaimActivityMutationResult,
  DeleteRecordInput,
  DeleteRecordResult,
  UploadBlobInput,
  UploadBlobResult,
  CertifiedLocationRecord,
  CertifiedLocationMutationResult,
  CreateCertifiedLocationInput,
  UpdateCertifiedLocationInput,
  UpsertCertifiedLocationInput,
  DefaultSiteRecord,
  DefaultSiteMutationResult,
  SetDefaultSiteInput,
  LayerRecord,
  LayerMutationResult,
  LayerType,
  CreateLayerInput,
  UpdateLayerInput,
  UpsertLayerInput,
  AudioRecordingRecord,
  AudioRecordingMutationResult,
  AudioTechnicalMetadata,
  CreateAudioRecordingInput,
  UpdateAudioRecordingInput,
  UpsertAudioRecordingInput,
} from "@gainforest/atproto-mutations-core";
import { UnauthorizedError, SessionExpiredError } from "../server";

// ---------------------------------------------------------------------------
// Error code literals
// ---------------------------------------------------------------------------

type OrgInfoErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "ALREADY_EXISTS"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type ClaimActivityErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type BlobErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

// ---------------------------------------------------------------------------
// Error mapper — Effect errors → MutationResult error codes
// ---------------------------------------------------------------------------

type OrgInfoEffectError =
  | OrganizationInfoAlreadyExistsError
  | OrganizationInfoNotFoundError
  | OrganizationInfoPdsError
  | OrganizationInfoValidationError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapOrgInfoError(
  e: OrgInfoEffectError
): MutationResult<never, OrgInfoErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "OrganizationInfoAlreadyExistsError":
      return err("ALREADY_EXISTS", `organization.info already exists: ${e.uri}`);
    case "OrganizationInfoNotFoundError":
      return err("NOT_FOUND", `organization.info not found for repo: ${e.repo}`);
    case "OrganizationInfoValidationError":
      return err("INVALID_RECORD", e.message);
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "OrganizationInfoPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type ClaimActivityEffectError =
  | ClaimActivityValidationError
  | ClaimActivityNotFoundError
  | ClaimActivityPdsError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapClaimActivityError(
  e: ClaimActivityEffectError
): MutationResult<never, ClaimActivityErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "ClaimActivityNotFoundError":
      return err("NOT_FOUND", `claim.activity not found at rkey: ${e.rkey}`);
    case "ClaimActivityValidationError":
      return err("INVALID_RECORD", e.message);
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "ClaimActivityPdsError":
      return err("PDS_ERROR", e.message);
  }
}

type BlobEffectError =
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapBlobError(
  e: BlobEffectError
): MutationResult<never, BlobErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
  }
}

// ---------------------------------------------------------------------------
// Helper: run an Effect against a caller-supplied agent layer
// ---------------------------------------------------------------------------

// The agent layer is passed as a parameter rather than read from a module-level
// config so that:
//   1. There are no hidden env reads inside this package.
//   2. Callers choose between makeUserAgentLayer / makeServiceAgentLayer at
//      the call site, enabling server-to-server composition with any auth scheme.
//   3. The actions are fully testable with a makeServiceAgentLayer(mockAgent).

// ---------------------------------------------------------------------------
// organization.info actions
// ---------------------------------------------------------------------------

/**
 * Create a new app.gainforest.organization.info record.
 * Fails with ALREADY_EXISTS if one already exists (use upsert for idempotent writes).
 */
export async function createOrganizationInfoAction(
  input: CreateOrganizationInfoInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<OrganizationInfoMutationResult, OrgInfoErrorCode>> {
  return Effect.runPromise(
    createOrganizationInfo(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

/**
 * Update an existing app.gainforest.organization.info record (partial patch).
 * Fails with NOT_FOUND if no record exists (use upsert if you want create-or-update).
 */
export async function updateOrganizationInfoAction(
  input: UpdateOrganizationInfoInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<OrganizationInfoMutationResult, OrgInfoErrorCode>> {
  return Effect.runPromise(
    updateOrganizationInfo(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

/**
 * Upsert an app.gainforest.organization.info record.
 * Creates if absent, fully replaces if present (preserving original createdAt).
 * Prefer this over manually sequencing create + update.
 */
export async function upsertOrganizationInfoAction(
  input: CreateOrganizationInfoInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<
  MutationResult<OrganizationInfoMutationResult & { created: boolean }, OrgInfoErrorCode>
> {
  return Effect.runPromise(
    upsertOrganizationInfo(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: OrgInfoEffectError) => Effect.succeed(mapOrgInfoError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// Blob action
// ---------------------------------------------------------------------------

/**
 * Upload a blob to the authenticated user's PDS.
 * Returns the BlobRef that can be embedded in subsequent record writes.
 *
 * Prefer the file-accepting inputs on create/update/upsert for most use cases.
 * Use this for advanced scenarios such as pre-uploading before a form submission.
 */
export async function uploadBlobAction(
  input: UploadBlobInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<UploadBlobResult, BlobErrorCode>> {
  return Effect.runPromise(
    uploadBlob(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: BlobEffectError) => Effect.succeed(mapBlobError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// claim.activity actions
// ---------------------------------------------------------------------------

/**
 * Create a new org.hypercerts.claim.activity record.
 * If `input.rkey` is absent, a TID is generated automatically.
 */
export async function createClaimActivityAction(
  input: CreateClaimActivityInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<ClaimActivityMutationResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    createClaimActivity(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

/**
 * Update an existing org.hypercerts.claim.activity record (partial patch).
 * Fails with NOT_FOUND if no record exists at `input.rkey`.
 */
export async function updateClaimActivityAction(
  input: UpdateClaimActivityInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<ClaimActivityMutationResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    updateClaimActivity(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

/**
 * Upsert an org.hypercerts.claim.activity record.
 * No rkey → always creates with a generated TID.
 * rkey present → creates if absent, fully replaces if found (preserving createdAt).
 */
export async function upsertClaimActivityAction(
  input: UpsertClaimActivityInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<
  MutationResult<ClaimActivityMutationResult & { created: boolean }, ClaimActivityErrorCode>
> {
  return Effect.runPromise(
    upsertClaimActivity(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

/**
 * Delete an org.hypercerts.claim.activity record by rkey.
 * Fails with NOT_FOUND if no record exists at `input.rkey`.
 */
export async function deleteClaimActivityAction(
  input: DeleteRecordInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<DeleteRecordResult, ClaimActivityErrorCode>> {
  return Effect.runPromise(
    deleteClaimActivity(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: ClaimActivityEffectError) =>
        Effect.succeed(mapClaimActivityError(e))
      ),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// certified.location actions
// ---------------------------------------------------------------------------

type CertifiedLocationErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "IS_DEFAULT"
  | "INVALID_RECORD"
  | "INVALID_GEOJSON"
  | "GEOJSON_PROCESSING"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type CertifiedLocationEffectError =
  | CertifiedLocationValidationError
  | CertifiedLocationNotFoundError
  | CertifiedLocationPdsError
  | CertifiedLocationIsDefaultError
  | GeoJsonValidationError
  | GeoJsonProcessingError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapCertifiedLocationError(
  e: CertifiedLocationEffectError
): MutationResult<never, CertifiedLocationErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "CertifiedLocationNotFoundError":
      return err("NOT_FOUND", `certified.location not found at rkey: ${e.rkey}`);
    case "CertifiedLocationIsDefaultError":
      return err("IS_DEFAULT", `Cannot delete the default site: ${e.uri}. Set a different default first.`);
    case "CertifiedLocationValidationError":
      return err("INVALID_RECORD", e.message);
    case "GeoJsonValidationError":
      return err("INVALID_GEOJSON", e.message);
    case "GeoJsonProcessingError":
      return err("GEOJSON_PROCESSING", e.message);
    case "FileConstraintError":
      return err("INVALID_RECORD", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "CertifiedLocationPdsError":
      return err("PDS_ERROR", e.message);
  }
}

export async function createCertifiedLocationAction(
  input: CreateCertifiedLocationInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<CertifiedLocationMutationResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    createCertifiedLocation(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateCertifiedLocationAction(
  input: UpdateCertifiedLocationInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<CertifiedLocationMutationResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    updateCertifiedLocation(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertCertifiedLocationAction(
  input: UpsertCertifiedLocationInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<CertifiedLocationMutationResult & { created: boolean }, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    upsertCertifiedLocation(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteCertifiedLocationAction(
  input: DeleteRecordInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<DeleteRecordResult, CertifiedLocationErrorCode>> {
  return Effect.runPromise(
    deleteCertifiedLocation(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: CertifiedLocationEffectError) => Effect.succeed(mapCertifiedLocationError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.defaultSite actions
// ---------------------------------------------------------------------------

type DefaultSiteErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "PDS_ERROR";

type DefaultSiteEffectError =
  | DefaultSiteValidationError
  | DefaultSiteLocationNotFoundError
  | DefaultSitePdsError
  | UnauthorizedError
  | SessionExpiredError;

function mapDefaultSiteError(
  e: DefaultSiteEffectError
): MutationResult<never, DefaultSiteErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "DefaultSiteLocationNotFoundError":
      return err("NOT_FOUND", `certified.location not found: ${e.locationUri}`);
    case "DefaultSiteValidationError":
      return err("INVALID_RECORD", e.message);
    case "DefaultSitePdsError":
      return err("PDS_ERROR", e.message);
  }
}

export async function setDefaultSiteAction(
  input: SetDefaultSiteInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<DefaultSiteMutationResult, DefaultSiteErrorCode>> {
  return Effect.runPromise(
    setDefaultSite(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: DefaultSiteEffectError) => Effect.succeed(mapDefaultSiteError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.layer actions
// ---------------------------------------------------------------------------

type LayerErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "PDS_ERROR";

type LayerEffectError =
  | LayerValidationError
  | LayerNotFoundError
  | LayerPdsError
  | UnauthorizedError
  | SessionExpiredError;

function mapLayerError(
  e: LayerEffectError
): MutationResult<never, LayerErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "LayerNotFoundError":
      return err("NOT_FOUND", `organization.layer not found at rkey: ${e.rkey}`);
    case "LayerValidationError":
      return err("INVALID_RECORD", e.message);
    case "LayerPdsError":
      return err("PDS_ERROR", e.message);
  }
}

export async function createLayerAction(
  input: CreateLayerInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<LayerMutationResult, LayerErrorCode>> {
  return Effect.runPromise(
    createLayer(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateLayerAction(
  input: UpdateLayerInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<LayerMutationResult, LayerErrorCode>> {
  return Effect.runPromise(
    updateLayer(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertLayerAction(
  input: UpsertLayerInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<LayerMutationResult & { created: boolean }, LayerErrorCode>> {
  return Effect.runPromise(
    upsertLayer(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteLayerAction(
  input: DeleteRecordInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<DeleteRecordResult, LayerErrorCode>> {
  return Effect.runPromise(
    deleteLayer(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: LayerEffectError) => Effect.succeed(mapLayerError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// organization.recordings.audio actions
// ---------------------------------------------------------------------------

type AudioRecordingErrorCode =
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "NOT_FOUND"
  | "INVALID_RECORD"
  | "FILE_CONSTRAINT"
  | "BLOB_UPLOAD_ERROR"
  | "PDS_ERROR";

type AudioRecordingEffectError =
  | AudioRecordingValidationError
  | AudioRecordingNotFoundError
  | AudioRecordingPdsError
  | FileConstraintError
  | BlobUploadError
  | UnauthorizedError
  | SessionExpiredError;

function mapAudioRecordingError(
  e: AudioRecordingEffectError
): MutationResult<never, AudioRecordingErrorCode> {
  switch (e._tag) {
    case "UnauthorizedError":
      return err("UNAUTHORIZED", e.message ?? "Not logged in");
    case "SessionExpiredError":
      return err("SESSION_EXPIRED", e.message ?? "Session expired, please log in again");
    case "AudioRecordingNotFoundError":
      return err("NOT_FOUND", `organization.recordings.audio not found at rkey: ${e.rkey}`);
    case "AudioRecordingValidationError":
      return err("INVALID_RECORD", e.message);
    case "FileConstraintError":
      return err("FILE_CONSTRAINT", e.reason);
    case "BlobUploadError":
      return err("BLOB_UPLOAD_ERROR", e.message);
    case "AudioRecordingPdsError":
      return err("PDS_ERROR", e.message);
  }
}

export async function createAudioRecordingAction(
  input: CreateAudioRecordingInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<AudioRecordingMutationResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    createAudioRecording(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function updateAudioRecordingAction(
  input: UpdateAudioRecordingInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<AudioRecordingMutationResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    updateAudioRecording(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function upsertAudioRecordingAction(
  input: UpsertAudioRecordingInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<AudioRecordingMutationResult & { created: boolean }, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    upsertAudioRecording(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

export async function deleteAudioRecordingAction(
  input: DeleteRecordInput,
  agentLayer: Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>
): Promise<MutationResult<DeleteRecordResult, AudioRecordingErrorCode>> {
  return Effect.runPromise(
    deleteAudioRecording(input).pipe(
      Effect.map((result) => ok(result)),
      Effect.catchAll((e: AudioRecordingEffectError) => Effect.succeed(mapAudioRecordingError(e))),
      Effect.provide(agentLayer)
    )
  );
}

// ---------------------------------------------------------------------------
// Re-export error code types so callers don't need a separate import
// ---------------------------------------------------------------------------
export type {
  OrgInfoErrorCode,
  ClaimActivityErrorCode,
  BlobErrorCode,
  CertifiedLocationErrorCode,
  DefaultSiteErrorCode,
  LayerErrorCode,
  LayerType,
  AudioRecordingErrorCode,
  AudioTechnicalMetadata,
  CertifiedLocationRecord,
  DefaultSiteRecord,
  LayerRecord,
  AudioRecordingRecord,
};
