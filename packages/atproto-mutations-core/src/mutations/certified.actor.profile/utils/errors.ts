import { Data } from "effect";

/**
 * Input failed validation against the app.certified.actor.profile lexicon.
 * Raised by all three operations (create, update, upsert) before any PDS call.
 */
export class CertifiedActorProfileValidationError extends Data.TaggedError(
  "CertifiedActorProfileValidationError"
)<{
  message: string;
  cause?: unknown;
}> {}

/**
 * A create was attempted but a record already exists in the repo.
 * app.certified.actor.profile uses key=literal:self — only one record per repo.
 * Use upsertCertifiedActorProfile if you want create-or-update semantics.
 */
export class CertifiedActorProfileAlreadyExistsError extends Data.TaggedError(
  "CertifiedActorProfileAlreadyExistsError"
)<{
  /** AT-URI of the existing record */
  uri: string;
}> {}

/**
 * An update was attempted but no record exists in the repo.
 */
export class CertifiedActorProfileNotFoundError extends Data.TaggedError(
  "CertifiedActorProfileNotFoundError"
)<{
  /** DID or handle of the repo that was checked */
  repo: string;
}> {}

/**
 * The PDS rejected or failed to process the record operation.
 * Wraps the raw error from agent.com.atproto.repo.* calls.
 */
export class CertifiedActorProfilePdsError extends Data.TaggedError(
  "CertifiedActorProfilePdsError"
)<{
  message: string;
  cause?: unknown;
}> {}
