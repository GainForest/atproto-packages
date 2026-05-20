import { Effect } from "effect";
import { $parse } from "@gainforest/generated/app/gainforest/ac/deployment.defs";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { applyPatch, fetchRecord, putRecord } from "../../utils/shared";
import { extractValidationIssues } from "../../validation";
import type { ValidationIssue } from "../../result";
import {
  AcDeploymentNotFoundError,
  AcDeploymentPdsError,
  AcDeploymentValidationError,
} from "./utils/errors";
import type {
  AcDeploymentMutationResult,
  AcDeploymentRecord,
  UpdateAcDeploymentInput,
} from "./utils/types";

const COLLECTION = "app.gainforest.ac.deployment";
const REQUIRED_FIELDS = new Set<string>(["name", "deviceModel", "deployedAt"]);

const makePdsError = (message: string, cause: unknown) =>
  new AcDeploymentPdsError({ message, cause });

const makeValidationError = (
  message: string,
  cause: unknown,
  issues?: ValidationIssue[],
) => new AcDeploymentValidationError({ message, cause, issues });

export const updateAcDeployment = (
  input: UpdateAcDeploymentInput,
): Effect.Effect<
  AcDeploymentMutationResult,
  AcDeploymentValidationError | AcDeploymentNotFoundError | AcDeploymentPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey, data, unset } = input;
    const existing = yield* fetchRecord(COLLECTION, rkey, $parse, makePdsError);

    if (existing === null) {
      return yield* Effect.fail(new AcDeploymentNotFoundError({ rkey }));
    }

    const merged = applyPatch(
      existing,
      data as Partial<AcDeploymentRecord>,
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
      record: record as AcDeploymentRecord,
    } satisfies AcDeploymentMutationResult;
  });

export {
  AcDeploymentNotFoundError,
  AcDeploymentPdsError,
  AcDeploymentValidationError,
};
