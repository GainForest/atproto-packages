import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/event.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  DwcEventNotFoundError,
  DwcEventPdsError,
  DwcEventValidationError,
} from "./utils/errors";
import type {
  DwcEventMutationResult,
  DwcEventRecord,
  UpdateDwcEventInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.event";
const REQUIRED_FIELDS = new Set<string>(["eventID", "eventDate"]);

const makePdsError = (message: string, cause: unknown) =>
  new DwcEventPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new DwcEventValidationError({ message, cause, issues });

export const updateDwcEvent = (
  input: UpdateDwcEventInput,
): Effect.Effect<
  DwcEventMutationResult,
  DwcEventValidationError | DwcEventNotFoundError | DwcEventPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;
    const existing = yield* fetchRecord(COLLECTION, rkey, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new DwcEventNotFoundError({ rkey }));
    }

    const merged = applyPatch(
      existing,
      data as Partial<DwcEventRecord>,
      unset as readonly string[] | undefined,
      REQUIRED_FIELDS,
    );

    const candidate = {
      ...merged,
      $type: COLLECTION,
      createdAt: existing.createdAt,
    };

    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => {
        const issues = extractValidationIssues(cause);
        return makeValidationError("Validation failed", cause, issues);
      },
    });

    const { uri, cid } = yield* putRecord(COLLECTION, rkey, record, makePdsError);

    return {
      uri,
      cid,
      rkey,
      record: record as DwcEventRecord,
    } satisfies DwcEventMutationResult;
  });

export { DwcEventNotFoundError, DwcEventPdsError, DwcEventValidationError };
