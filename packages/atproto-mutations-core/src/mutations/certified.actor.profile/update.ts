import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
  main as profileSchema,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  CertifiedActorProfileMutationResult,
  CertifiedActorProfileRecord,
  UpdateCertifiedActorProfileInput,
} from "./utils/types";
import {
  CertifiedActorProfileNotFoundError,
  CertifiedActorProfilePdsError,
  CertifiedActorProfileValidationError,
} from "./utils/errors";
import { applyPatch } from "./utils/merge";
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

export const updateCertifiedActorProfile = (
  input: UpdateCertifiedActorProfileInput
): Effect.Effect<
  CertifiedActorProfileMutationResult,
  | CertifiedActorProfileValidationError
  | CertifiedActorProfileNotFoundError
  | CertifiedActorProfilePdsError
  | FileConstraintError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    yield* validateFileConstraints(input.data, BLOB_CONSTRAINTS);

    const existing = yield* fetchRecord<CertifiedActorProfileRecord, CertifiedActorProfilePdsError>(
      COLLECTION, RKEY, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(
        new CertifiedActorProfileNotFoundError({ repo: (yield* AtprotoAgent).assertDid })
      );
    }

    const patched = applyPatch(existing, input.data, input.unset) as CertifiedActorProfileRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, RKEY, record, makePdsError);

    return { uri, cid, record: record as CertifiedActorProfileRecord } satisfies CertifiedActorProfileMutationResult;
  });

export {
  CertifiedActorProfileNotFoundError,
  CertifiedActorProfilePdsError,
  CertifiedActorProfileValidationError,
  FileConstraintError,
  BlobUploadError,
};
