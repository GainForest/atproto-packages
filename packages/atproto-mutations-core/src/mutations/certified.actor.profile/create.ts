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
  CertifiedActorProfileAlreadyExistsError,
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
  createRecord,
} from "../../utils/shared";

const COLLECTION = "app.certified.actor.profile";
const RKEY = "self";

const BLOB_CONSTRAINTS = extractBlobConstraints(profileSchema);

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedActorProfilePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new CertifiedActorProfileValidationError({ message, cause });

export const createCertifiedActorProfile = (
  input: CreateCertifiedActorProfileInput
): Effect.Effect<
  CertifiedActorProfileMutationResult,
  | CertifiedActorProfileValidationError
  | CertifiedActorProfileAlreadyExistsError
  | CertifiedActorProfilePdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input, BLOB_CONSTRAINTS);

    const createdAt = new Date().toISOString();
    const candidate = { $type: COLLECTION, ...input, createdAt };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const existing = yield* fetchRecord(COLLECTION, RKEY, makePdsError);

    if (existing !== null) {
      return yield* Effect.fail(
        new CertifiedActorProfileAlreadyExistsError({ uri: `at://${(yield* AtprotoAgent).assertDid}/${COLLECTION}/${RKEY}` })
      );
    }

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, RKEY, makePdsError);

    return { uri, cid, record: record as CertifiedActorProfileRecord } satisfies CertifiedActorProfileMutationResult;
  });

export {
  CertifiedActorProfileAlreadyExistsError,
  CertifiedActorProfilePdsError,
  CertifiedActorProfileValidationError,
  FileConstraintError,
  BlobUploadError,
};
