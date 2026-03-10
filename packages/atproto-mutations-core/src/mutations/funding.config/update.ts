import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse,
} from "@gainforest/generated/app/bumicerts/funding/config.defs";
import type {
  FundingConfigMutationResult,
  FundingConfigRecord,
  UpdateFundingConfigInput,
} from "./utils/types";
import {
  FundingConfigNotFoundError,
  FundingConfigPdsError,
  FundingConfigValidationError,
} from "./utils/errors";
import { applyPatch } from "./utils/merge";
import { BlobUploadError } from "../../blob/errors";
import {
  stubValidate,
  finalValidate,
  resolveFileInputs,
  fetchRecord,
  putRecord,
} from "../../utils/shared";

const COLLECTION = "app.bumicerts.funding.config";

const makePdsError = (message: string, cause: unknown) =>
  new FundingConfigPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new FundingConfigValidationError({ message, cause });

export const updateFundingConfig = (
  input: UpdateFundingConfigInput
): Effect.Effect<
  FundingConfigMutationResult,
  | FundingConfigValidationError
  | FundingConfigNotFoundError
  | FundingConfigPdsError
  | BlobUploadError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    const existing = yield* fetchRecord<FundingConfigRecord, FundingConfigPdsError>(
      COLLECTION, rkey, makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new FundingConfigNotFoundError({ rkey }));
    }

    const patched = applyPatch(existing, input.data, input.unset) as FundingConfigRecord;
    patched.$type = COLLECTION;
    patched.createdAt = existing.createdAt;
    patched.updatedAt = new Date().toISOString();

    yield* stubValidate(patched, $parse, makeValidationError);

    const resolved = yield* resolveFileInputs(patched);
    const record = yield* finalValidate(resolved, $parse, makeValidationError);

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return { uri, cid, rkey, record: record as FundingConfigRecord } satisfies FundingConfigMutationResult;
  });

export {
  FundingConfigNotFoundError,
  FundingConfigPdsError,
  FundingConfigValidationError,
  BlobUploadError,
};
