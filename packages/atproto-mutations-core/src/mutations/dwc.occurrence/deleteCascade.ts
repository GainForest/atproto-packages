import type { Agent } from "@atproto/api";
import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import {
  $parse as parseDatasetRecord,
  type Main as DwcDatasetRecord,
} from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import {
  DwcOccurrenceNotFoundError,
  DwcOccurrencePdsError,
  DwcOccurrenceValidationError,
} from "./utils/errors";
import type {
  DeleteDwcOccurrenceCascadeInput,
  DeleteDwcOccurrenceCascadeResult,
} from "./utils/types";

const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const MEASUREMENT_COLLECTION = "app.gainforest.dwc.measurement";
const MULTIMEDIA_COLLECTION = "app.gainforest.ac.multimedia";
const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const LIST_RECORDS_PAGE_LIMIT = 100;

const makePdsError = (message: string, cause: unknown) =>
  new DwcOccurrencePdsError({ message, cause });

type DeleteWrite = {
  $type: "com.atproto.repo.applyWrites#delete";
  collection: string;
  rkey: string;
};

type UpdateWrite = {
  $type: "com.atproto.repo.applyWrites#update";
  collection: string;
  rkey: string;
  value: DwcDatasetRecord;
  swapRecord?: string;
};

type ApplyWrite = DeleteWrite | UpdateWrite;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotFoundError(value: unknown): boolean {
  if (isRecord(value) && value.status === 404) {
    return true;
  }

  if (isRecord(value) && isRecord(value.cause) && value.cause.status === 404) {
    return true;
  }

  return false;
}

function validateInput(input: unknown): DeleteDwcOccurrenceCascadeInput {
  if (!isRecord(input) || typeof input.rkey !== "string" || input.rkey.length === 0) {
    throw new Error("Tree occurrence rkey is required.");
  }

  return { rkey: input.rkey };
}

function getOccurrenceRef(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.occurrenceRef === "string" ? value.occurrenceRef : null;
}

function getDatasetRef(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.datasetRef === "string" ? value.datasetRef : null;
}

function getRkeyFromUri(uri: string): string | null {
  const rkey = uri.split("/").at(-1);
  return rkey && rkey.length > 0 ? rkey : null;
}

function resolveOccurrenceForDeletion(options: {
  agent: Agent;
  rkey: string;
}): Effect.Effect<{ datasetRef: string | null } | null, DwcOccurrencePdsError> {
  const { agent, rkey } = options;

  return Effect.tryPromise({
    try: async () => {
      try {
        const response = await agent.com.atproto.repo.getRecord({
          repo: agent.assertDid,
          collection: OCCURRENCE_COLLECTION,
          rkey,
        });
        return { datasetRef: getDatasetRef(response.data.value) };
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },
    catch: (cause) =>
      makePdsError("Failed to verify the tree occurrence before deleting it.", cause),
  });
}

function createDatasetCountUpdateWrite(options: {
  agent: Agent;
  datasetRef: string | null;
}): Effect.Effect<UpdateWrite | null, DwcOccurrencePdsError> {
  const { agent, datasetRef } = options;
  const datasetRkey = datasetRef ? getRkeyFromUri(datasetRef) : null;

  if (!datasetRkey) {
    return Effect.succeed(null);
  }

  return Effect.tryPromise({
    try: async () => {
      try {
        const response = await agent.com.atproto.repo.getRecord({
          repo: agent.assertDid,
          collection: DATASET_COLLECTION,
          rkey: datasetRkey,
        });
        let record: DwcDatasetRecord;
        try {
          record = parseDatasetRecord(response.data.value);
        } catch {
          return null;
        }

        if (typeof record.recordCount !== "number") {
          return null;
        }

        return {
          $type: "com.atproto.repo.applyWrites#update",
          collection: DATASET_COLLECTION,
          rkey: datasetRkey,
          value: {
            ...record,
            recordCount: Math.max(0, record.recordCount - 1),
          },
          swapRecord: response.data.cid,
        } satisfies UpdateWrite;
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },
    catch: (cause) =>
      makePdsError("Failed to prepare the dataset count update.", cause),
  });
}

function listLinkedRecordRkeys(options: {
  agent: Agent;
  collection: string;
  occurrenceUri: string;
  failureMessage: string;
}): Effect.Effect<string[], DwcOccurrencePdsError> {
  const { agent, collection, occurrenceUri, failureMessage } = options;

  return Effect.tryPromise({
    try: async () => {
      const rkeys: string[] = [];
      let cursor: string | undefined;

      do {
        const response = await agent.com.atproto.repo.listRecords({
          repo: agent.assertDid,
          collection,
          limit: LIST_RECORDS_PAGE_LIMIT,
          cursor,
        });

        for (const record of response.data.records) {
          if (getOccurrenceRef(record.value) !== occurrenceUri) {
            continue;
          }

          const rkey = getRkeyFromUri(record.uri);
          if (rkey) {
            rkeys.push(rkey);
          }
        }

        cursor = response.data.cursor;
      } while (cursor);

      return rkeys;
    },
    catch: (cause) => makePdsError(failureMessage, cause),
  });
}

function createDeleteWrite(collection: string, rkey: string): DeleteWrite {
  return {
    $type: "com.atproto.repo.applyWrites#delete",
    collection,
    rkey,
  };
}

function applyDeleteWrites(options: {
  agent: Agent;
  writes: ApplyWrite[];
  failureMessage: string;
}): Effect.Effect<void, DwcOccurrencePdsError> {
  const { agent, writes, failureMessage } = options;

  if (writes.length === 0) {
    return Effect.void;
  }

  return Effect.tryPromise({
    try: async () => {
      await agent.com.atproto.repo.applyWrites({
        repo: agent.assertDid,
        writes,
      });
    },
    catch: (cause) => makePdsError(failureMessage, cause),
  });
}

export const deleteDwcOccurrenceCascade = (
  input: DeleteDwcOccurrenceCascadeInput,
): Effect.Effect<
  DeleteDwcOccurrenceCascadeResult,
  | DwcOccurrenceValidationError
  | DwcOccurrenceNotFoundError
  | DwcOccurrencePdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = yield* Effect.try({
      try: () => validateInput(input),
      catch: (cause) =>
        new DwcOccurrenceValidationError({
          message: "Tree occurrence rkey is required.",
          cause,
        }),
    });
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${OCCURRENCE_COLLECTION}/${rkey}`;

    const occurrence = yield* resolveOccurrenceForDeletion({ agent, rkey });

    if (!occurrence) {
      return yield* Effect.fail(new DwcOccurrenceNotFoundError({ rkey }));
    }

    const linkedMultimediaRkeys = yield* listLinkedRecordRkeys({
      agent,
      collection: MULTIMEDIA_COLLECTION,
      occurrenceUri: uri,
      failureMessage: "Failed to load linked multimedia records before deleting the tree.",
    });
    const linkedMeasurementRkeys = yield* listLinkedRecordRkeys({
      agent,
      collection: MEASUREMENT_COLLECTION,
      occurrenceUri: uri,
      failureMessage: "Failed to load linked measurement records before deleting the tree.",
    });
    const datasetCountWrite = yield* createDatasetCountUpdateWrite({
      agent,
      datasetRef: occurrence.datasetRef,
    });
    const writes = [
      ...(datasetCountWrite ? [datasetCountWrite] : []),
      ...linkedMultimediaRkeys.map((linkedRkey) =>
        createDeleteWrite(MULTIMEDIA_COLLECTION, linkedRkey),
      ),
      ...linkedMeasurementRkeys.map((linkedRkey) =>
        createDeleteWrite(MEASUREMENT_COLLECTION, linkedRkey),
      ),
      createDeleteWrite(OCCURRENCE_COLLECTION, rkey),
    ];

    yield* applyDeleteWrites({
      agent,
      writes,
      failureMessage: "Failed to delete the tree and linked records.",
    });

    return {
      uri,
      rkey,
      deletedMeasurementRkeys: linkedMeasurementRkeys,
      deletedMultimediaRkeys: linkedMultimediaRkeys,
    };
  });

export {
  DwcOccurrenceValidationError,
  DwcOccurrenceNotFoundError,
  DwcOccurrencePdsError,
};
