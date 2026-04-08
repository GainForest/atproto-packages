import { Effect } from "effect";
import type { ValidationIssue } from "../../result";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/org/hypercerts/funding/receipt.defs";
import type {
  FundingReceiptMutationResult,
  FundingReceiptRecord,
  CreateFundingReceiptInput,
} from "./utils/types";
import {
  FundingReceiptPdsError,
  FundingReceiptValidationError,
} from "./utils/errors";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  createRecord,
} from "../../utils/shared";

const COLLECTION = "org.hypercerts.funding.receipt";

const makePdsError = (message: string, cause: unknown) =>
  new FundingReceiptPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new FundingReceiptValidationError({ message, cause, issues });

/**
 * Creates a new org.hypercerts.funding.receipt record in the authenticated
 * ATProto repo. This is an immutable/append-only record — there is no
 * update, upsert, or delete.
 *
 * In practice, this is called server-side by the facilitator (using its own
 * credential layer) after a successful on-chain USDC transfer.
 */
export const createFundingReceipt = (
  input: CreateFundingReceiptInput
): Effect.Effect<
  FundingReceiptMutationResult,
  FundingReceiptValidationError | FundingReceiptPdsError | BlobUploadError,
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
      record: record as FundingReceiptRecord,
    } satisfies FundingReceiptMutationResult;
  });

export { FundingReceiptPdsError, FundingReceiptValidationError };
