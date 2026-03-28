import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as profileSchema,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  CreateCertifiedActorProfileInput,
  CertifiedActorProfileMutationResult,
  CertifiedActorProfileRecord,
} from "./utils/types";
import {
  CertifiedActorProfilePdsError,
  CertifiedActorProfileValidationError,
} from "./utils/errors";
import { extractBlobConstraints } from "../../blob/introspect";
import { validateFileConstraints } from "../../blob/helpers";
import { FileConstraintError, BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.certified.actor.profile";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(profileSchema);

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedActorProfilePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new CertifiedActorProfileValidationError({ message, cause });

export const upsertCertifiedActorProfile = (
  input: CreateCertifiedActorProfileInput
): Effect.Effect<
  CertifiedActorProfileMutationResult & { created: boolean },
  | CertifiedActorProfileValidationError
  | CertifiedActorProfilePdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<CertifiedActorProfileRecord, CertifiedActorProfilePdsError>(
      COLLECTION, RKEY, makePdsError
    );

    const createdAt = existing !== null
      ? existing.createdAt
      : new Date().toISOString();

    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return {
      uri,
      cid,
      record: record as CertifiedActorProfileRecord,
      created: existing === null,
    };
  });

export { CertifiedActorProfilePdsError, CertifiedActorProfileValidationError };
