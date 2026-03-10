import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/org/impactindexer/link/attestation.defs";
import type {
  LinkAttestationMutationResult,
  LinkAttestationRecord,
  CreateLinkAttestationInput,
} from "./utils/types";
import {
  LinkAttestationPdsError,
  LinkAttestationValidationError,
} from "./utils/errors";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "org.impactindexer.link.attestation";

const makePdsError = (message: string, cause: unknown) =>
  new LinkAttestationPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new LinkAttestationValidationError({ message, cause });

/**
 * Creates a new org.impactindexer.link.attestation record in the authenticated
 * ATProto repo. This is an immutable/append-only record — there is no
 * update, upsert, or delete.
 *
 * Called by the user (via /api/identity-link) when they want to link their
 * EVM wallet to their ATProto DID. The record is written to the user's own
 * PDS using their OAuth session.
 */
export const createLinkAttestation = (
  input: CreateLinkAttestationInput
): Effect.Effect<
  LinkAttestationMutationResult,
  LinkAttestationValidationError | LinkAttestationPdsError | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey: inputRkey, ...inputData } = input;
    const candidate = {
      $type: COLLECTION,
      ...inputData,
      createdAt: new Date().toISOString(),
    };

    yield* stubValidate(candidate, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(candidate);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* createRecord(COLLECTION, record, inputRkey, makePdsError);
    const rkey = uri.split("/").pop()!;

    return {
      uri,
      cid,
      rkey,
      record: record as LinkAttestationRecord,
    } satisfies LinkAttestationMutationResult;
  });

export { LinkAttestationPdsError, LinkAttestationValidationError, BlobUploadError };
