import { Effect } from "effect";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import {
  DwcOccurrenceValidationError,
  DwcOccurrencePdsError,
} from "./utils/errors";
import type {
  CreateDwcOccurrenceInput,
  DwcOccurrenceMutationResult,
  DwcOccurrenceRecord,
} from "./utils/types";

const COLLECTION = "app.gainforest.dwc.occurrence";

const makePdsError = (message: string, cause: unknown) =>
  new DwcOccurrencePdsError({ message, cause });

const makeValidationError = (message: string, cause: unknown, issues?: ValidationIssue[]) =>
  new DwcOccurrenceValidationError({ message, cause, issues });

export const createDwcOccurrence = (
  input: CreateDwcOccurrenceInput
): Effect.Effect<
  DwcOccurrenceMutationResult,
  DwcOccurrenceValidationError | DwcOccurrencePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, ...recordInput } = input;

    // 1. Build candidate record with $type, createdAt, and defaults applied.
    const createdAt = new Date().toISOString();
    const candidate = {
      ...recordInput,
      $type: COLLECTION,
      basisOfRecord: recordInput.basisOfRecord ?? "HumanObservation",
      occurrenceID: recordInput.occurrenceID ?? crypto.randomUUID(),
      occurrenceStatus: recordInput.occurrenceStatus ?? "present",
      geodeticDatum: recordInput.geodeticDatum ?? "EPSG:4326",
      license: recordInput.license ?? "CC-BY-4.0",
      kingdom: recordInput.kingdom ?? "Plantae",
      createdAt,
    };

    // 2. Validate with $parse from generated types.
    const record = yield* Effect.try({
      try: () => $parse(candidate),
      catch: (cause) => { const issues = extractValidationIssues(cause); return makeValidationError("Validation failed", cause, issues); },
    });

    // 3. Write to PDS (rkey optional — PDS assigns TID when omitted).
    const { uri, cid } = yield* createRecord(COLLECTION, record, rkey, makePdsError);
    const assignedRkey = uri.split("/").pop() ?? rkey ?? "unknown";

    return {
      uri,
      cid,
      rkey: assignedRkey,
      record: record as DwcOccurrenceRecord,
    } satisfies DwcOccurrenceMutationResult;
  });

export { DwcOccurrenceValidationError, DwcOccurrencePdsError };
