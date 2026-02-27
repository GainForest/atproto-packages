import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/organization/layer.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import { LayerValidationError, LayerPdsError } from "./utils/errors";
import type { CreateLayerInput, LayerMutationResult, LayerRecord } from "./utils/types";

const COLLECTION = "app.gainforest.organization.layer";

const makePdsError = (message: string, cause: unknown) =>
  new LayerPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown) =>
  new LayerValidationError({ message, cause });

export const createLayer = (
  input: CreateLayerInput
): Effect.Effect<
  LayerMutationResult,
  LayerValidationError | LayerPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { name, type, uri, description, rkey } = input;

    const createdAt = new Date().toISOString();
    const candidate = {
      $type: COLLECTION,
      name,
      type,
      uri,
      description,
      createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => makeValidationError(`organization.layer record failed lexicon validation: ${String(cause)}`, cause),
    });

    const { uri: resultUri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri: resultUri,
      cid,
      rkey: assignedRkey,
      record: record as LayerRecord,
    } satisfies LayerMutationResult;
  });

export { LayerValidationError, LayerPdsError };
