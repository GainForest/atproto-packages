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
const MAX_APPLY_WRITES_PER_COMMIT = 200;

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

function makeValidationError(message: string): DwcOccurrenceValidationError {
  return new DwcOccurrenceValidationError({ message });
}

function validateInput(
  input: unknown,
): Effect.Effect<DeleteDwcOccurrenceCascadeInput, DwcOccurrenceValidationError> {
  if (!isRecord(input) || typeof input.rkey !== "string" || input.rkey.length === 0) {
    return Effect.fail(makeValidationError("Tree occurrence rkey is required."));
  }

  return Effect.succeed({ rkey: input.rkey });
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

function countDatasetOccurrences(options: {
  agent: Agent;
  datasetRef: string;
}): Effect.Effect<number, DwcOccurrencePdsError> {
  const { agent, datasetRef } = options;

  return Effect.tryPromise({
    try: async () => {
      let cursor: string | undefined;
      let count = 0;

      do {
        const response = await agent.com.atproto.repo.listRecords({
          repo: agent.assertDid,
          collection: OCCURRENCE_COLLECTION,
          limit: LIST_RECORDS_PAGE_LIMIT,
          cursor,
        });

        for (const record of response.data.records) {
          if (getDatasetRef(record.value) === datasetRef) {
            count += 1;
          }
        }

        cursor = response.data.cursor;
      } while (cursor);

      return count;
    },
    catch: (cause) =>
      makePdsError(
        "Failed to recount linked dataset occurrences before deleting the tree.",
        cause,
      ),
  });
}

function fetchDatasetForCountUpdate(options: {
  agent: Agent;
  datasetRkey: string;
}): Effect.Effect<{ cid?: string; value: unknown } | null, DwcOccurrencePdsError> {
  const { agent, datasetRkey } = options;

  return Effect.tryPromise({
    try: async () => {
      try {
        const response = await agent.com.atproto.repo.getRecord({
          repo: agent.assertDid,
          collection: DATASET_COLLECTION,
          rkey: datasetRkey,
        });

        return {
          cid: response.data.cid,
          value: response.data.value,
        };
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },
    catch: (cause) =>
      makePdsError("Failed to load the linked dataset for count update.", cause),
  });
}

function parseDatasetForCountUpdate(
  value: unknown,
): Effect.Effect<DwcDatasetRecord, DwcOccurrencePdsError> {
  return Effect.try({
    try: () => parseDatasetRecord(value),
    catch: (cause) =>
      makePdsError(
        "Linked dataset record is invalid; aborting tree deletion to preserve dataset counts.",
        cause,
      ),
  });
}

function createDatasetCountUpdateWrite(options: {
  agent: Agent;
  datasetRef: string | null;
}): Effect.Effect<UpdateWrite | null, DwcOccurrencePdsError> {
  const { agent, datasetRef } = options;
  const datasetRkey = datasetRef ? getRkeyFromUri(datasetRef) : null;

  if (!datasetRkey || !datasetRef) {
    return Effect.succeed(null);
  }

  return Effect.gen(function* () {
    const dataset = yield* fetchDatasetForCountUpdate({ agent, datasetRkey });

    if (!dataset) {
      return null;
    }

    const record = yield* parseDatasetForCountUpdate(dataset.value);
    const currentRecordCount =
      typeof record.recordCount === "number"
        ? record.recordCount
        : yield* countDatasetOccurrences({ agent, datasetRef });

    return {
      $type: "com.atproto.repo.applyWrites#update",
      collection: DATASET_COLLECTION,
      rkey: datasetRkey,
      value: {
        ...record,
        recordCount: Math.max(0, currentRecordCount - 1),
      },
      swapRecord: dataset.cid,
    } satisfies UpdateWrite;
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

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
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

function applyCascadeWrites(options: {
  agent: Agent;
  datasetCountWrite: UpdateWrite | null;
  childDeleteWrites: DeleteWrite[];
  occurrenceDeleteWrite: DeleteWrite | null;
}): Effect.Effect<void, DwcOccurrencePdsError> {
  const {
    agent,
    datasetCountWrite,
    childDeleteWrites,
    occurrenceDeleteWrite,
  } = options;
  const parentDeleteWrites: ApplyWrite[] = [
    ...(datasetCountWrite ? [datasetCountWrite] : []),
    ...(occurrenceDeleteWrite ? [occurrenceDeleteWrite] : []),
  ];
  const allWrites: ApplyWrite[] = [
    ...(datasetCountWrite ? [datasetCountWrite] : []),
    ...childDeleteWrites,
    ...(occurrenceDeleteWrite ? [occurrenceDeleteWrite] : []),
  ];

  if (allWrites.length <= MAX_APPLY_WRITES_PER_COMMIT) {
    return applyDeleteWrites({
      agent,
      writes: allWrites,
      failureMessage: "Failed to delete the tree and linked records.",
    });
  }

  return Effect.gen(function* () {
    // Oversized cascades cannot fit in one ATProto commit. Make the
    // dataset/occurrence state durable first so a stale dataset swap or parent
    // delete failure cannot leave a partially-deleted tree. If child cleanup
    // fails after this point, callers can retry: a missing occurrence with
    // remaining linked children is handled as resumable cleanup below.
    yield* applyDeleteWrites({
      agent,
      writes: parentDeleteWrites,
      failureMessage: "Failed to delete the tree occurrence before deleting linked records.",
    });

    for (const childDeleteChunk of chunkArray(
      childDeleteWrites,
      MAX_APPLY_WRITES_PER_COMMIT,
    )) {
      yield* applyDeleteWrites({
        agent,
        writes: childDeleteChunk,
        failureMessage:
          "Failed to delete linked records after deleting the tree occurrence. Retry tree deletion to clean up remaining linked records.",
      });
    }
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
    const { rkey } = yield* validateInput(input);
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${OCCURRENCE_COLLECTION}/${rkey}`;

    const occurrence = yield* resolveOccurrenceForDeletion({ agent, rkey });

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

    if (
      !occurrence &&
      linkedMultimediaRkeys.length === 0 &&
      linkedMeasurementRkeys.length === 0
    ) {
      return yield* Effect.fail(new DwcOccurrenceNotFoundError({ rkey }));
    }

    const datasetCountWrite = occurrence
      ? yield* createDatasetCountUpdateWrite({
          agent,
          datasetRef: occurrence.datasetRef,
        })
      : null;
    const childDeleteWrites = [
      ...linkedMultimediaRkeys.map((linkedRkey) =>
        createDeleteWrite(MULTIMEDIA_COLLECTION, linkedRkey),
      ),
      ...linkedMeasurementRkeys.map((linkedRkey) =>
        createDeleteWrite(MEASUREMENT_COLLECTION, linkedRkey),
      ),
    ];

    yield* applyCascadeWrites({
      agent,
      datasetCountWrite,
      childDeleteWrites,
      occurrenceDeleteWrite: occurrence
        ? createDeleteWrite(OCCURRENCE_COLLECTION, rkey)
        : null,
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
