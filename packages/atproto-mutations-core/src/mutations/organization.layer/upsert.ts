import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { $parse } from "@gainforest/generated/app/gainforest/organization/layer.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { fetchRecord, createRecord, putRecord } from "../../utils/shared";
import { LayerValidationError, LayerPdsError } from "./utils/errors";
import type { UpsertLayerInput, LayerMutationResult, LayerRecord } from "./utils/types";

const COLLECTION = "app.gainforest.organization.layer";

const makePdsError = (message: string, cause: unknown) =>
  new LayerPdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new LayerValidationError({ message, cause, issues });

/**
 * Upsert an organization.layer record.
 *
 * - When `rkey` is omitted: always creates a new record.
 * - When `rkey` is provided: updates if found, creates (at that rkey) if not found.
 *
 * Returns `{ created: true }` when a new record was written.
 */
export const upsertLayer = (
  input: UpsertLayerInput
): Effect.Effect<
  LayerMutationResult & { created: boolean },
  LayerValidationError | LayerPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { name, type, uri, description, rkey } = input;

    let existing: LayerRecord | null = null;
    if (rkey) {
      existing = yield* fetchRecord(
        COLLECTION, rkey, $parse, makePdsError
      );
    }

    const createdAt = existing !== null ? existing.createdAt : new Date().toISOString();

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
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    const isCreate = !rkey || existing === null;
    let resultUri: string;
    let cid: string;
    let assignedRkey: string;

    if (isCreate) {
      const result = yield* createRecord(COLLECTION, record, rkey, makePdsError);
      resultUri = result.uri;
      cid = result.cid;
      assignedRkey = resultUri.split("/").pop() ?? rkey ?? "unknown";
    } else {
      const result = yield* putRecord(COLLECTION, rkey!, record, makePdsError);
      resultUri = result.uri;
      cid = result.cid;
      assignedRkey = rkey!;
    }

    return {
      uri: resultUri,
      cid,
      rkey: assignedRkey,
      record: record as LayerRecord,
      created: isCreate,
    };
  });

export { LayerValidationError, LayerPdsError };
