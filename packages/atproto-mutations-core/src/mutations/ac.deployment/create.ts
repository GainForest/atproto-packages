import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/ac/deployment.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { createRecord } from "../../utils/shared";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  AcDeploymentPdsError,
  AcDeploymentValidationError,
} from "./utils/errors";
import type {
  AcDeploymentMutationResult,
  AcDeploymentRecord,
  CreateAcDeploymentInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.ac.deployment";

const makePdsError = (message: string, cause: unknown) =>
  new AcDeploymentPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new AcDeploymentValidationError({ message, cause, issues });

export const createAcDeployment = (
  input: CreateAcDeploymentInput,
): Effect.Effect<
  AcDeploymentMutationResult,
  AcDeploymentValidationError | AcDeploymentPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, ...recordInput } = input;

    const candidate = {
      ...recordInput,
      $type: COLLECTION,
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
      record: record as AcDeploymentRecord,
    } satisfies AcDeploymentMutationResult;
  });

export { AcDeploymentPdsError, AcDeploymentValidationError };
