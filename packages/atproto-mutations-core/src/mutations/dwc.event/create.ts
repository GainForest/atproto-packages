import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/event.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { DwcEventPdsError, DwcEventValidationError } from "./utils/errors";
import type {
  CreateDwcEventInput,
  DwcEventMutationResult,
  DwcEventRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.event";

const makePdsError = (message: string, cause: unknown) =>
  new DwcEventPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new DwcEventValidationError({ message, cause, issues });

export const createDwcEvent = (
  input: CreateDwcEventInput,
): Effect.Effect<
  DwcEventMutationResult,
  DwcEventValidationError | DwcEventPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, ...recordInput } = input;

    const candidate = {
      ...recordInput,
      $type: COLLECTION,
      geodeticDatum: recordInput.geodeticDatum ?? "EPSG:4326",
      createdAt: new Date().toISOString(),
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => {
        const issues = extractValidationIssues(cause);
        return makeValidationError("Validation failed", cause, issues);
      },
    });

    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as DwcEventRecord,
    } satisfies DwcEventMutationResult;
  });

export { DwcEventPdsError, DwcEventValidationError };
