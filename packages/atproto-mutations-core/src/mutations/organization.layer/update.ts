import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { $parse } from "@gainforest/generated/app/gainforest/organization/layer.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { fetchRecord, putRecord } from "../../utils/shared";
import { applyLayerPatch } from "./utils/merge";
import { LayerValidationError, LayerNotFoundError, LayerPdsError } from "./utils/errors";
import type { UpdateLayerInput, LayerMutationResult, LayerRecord } from "./utils/types";

const COLLECTION = "app.gainforest.organization.layer";

const makePdsError = (message: string, cause: unknown) =>
  new LayerPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new LayerValidationError({ message, cause, issues });

export const updateLayer = (
  input: UpdateLayerInput
): Effect.Effect<
  LayerMutationResult,
  LayerValidationError | LayerNotFoundError | LayerPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;

    const existing = yield* fetchRecord<LayerRecord, LayerPdsError>(
      COLLECTION, rkey, makePdsError
    );
    if (existing === null) {
      return yield* Effect.fail(new LayerNotFoundError({ rkey }));
    }

    const patched = applyLayerPatch(existing, data, unset);
    patched["$type"] = COLLECTION;
    patched["createdAt"] = existing.createdAt;

    const record = yield* Effect.try({
      try: () => $parse(patched),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as LayerRecord,
    } satisfies LayerMutationResult;
  });

export { LayerValidationError, LayerNotFoundError, LayerPdsError };
