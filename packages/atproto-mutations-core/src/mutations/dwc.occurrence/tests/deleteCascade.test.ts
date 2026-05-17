import { describe, expect, it } from "bun:test";
import type { Agent } from "@atproto/api";
import { Effect, Layer } from "effect";
import { AtprotoAgent } from "../../../services/AtprotoAgent";
import { deleteDwcOccurrenceCascade } from "../deleteCascade";
import {
  DwcOccurrencePdsError,
  DwcOccurrenceValidationError,
} from "../utils/errors";

const DID = "did:plc:testdeletecascade";
const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const MEASUREMENT_COLLECTION = "app.gainforest.dwc.measurement";
const MULTIMEDIA_COLLECTION = "app.gainforest.ac.multimedia";
const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const OCCURRENCE_RKEY = "tree-1";
const DATASET_RKEY = "dataset-1";
const OCCURRENCE_URI = `at://${DID}/${OCCURRENCE_COLLECTION}/${OCCURRENCE_RKEY}`;
const DATASET_URI = `at://${DID}/${DATASET_COLLECTION}/${DATASET_RKEY}`;
const APPLY_WRITES_LIMIT = 200;

type StoredRecord = {
  uri: string;
  cid: string;
  value: Record<string, unknown>;
};

type FakeApplyWrite = {
  $type: string;
  collection: string;
  rkey: string;
  value?: Record<string, unknown>;
  swapRecord?: string;
};

type FakeAgentState = {
  datasetCid: string;
  datasetRecord: Record<string, unknown>;
  occurrenceRecords: Map<string, StoredRecord>;
  multimediaRecords: Map<string, StoredRecord>;
  measurementRecords: Map<string, StoredRecord>;
  applyWritesBatches: FakeApplyWrite[][];
};

function makeMissingRecordError(): Error & { status: number } {
  return Object.assign(new Error("Record not found"), { status: 404 });
}

function makeStoredRecord(
  collection: string,
  rkey: string,
  value: Record<string, unknown>,
): StoredRecord {
  return {
    uri: `at://${DID}/${collection}/${rkey}`,
    cid: `${rkey}-cid-0`,
    value,
  };
}

function makeChildRecord(collection: string, rkey: string): StoredRecord {
  return makeStoredRecord(collection, rkey, {
    $type: collection,
    occurrenceRef: OCCURRENCE_URI,
    createdAt: "2026-02-01T00:00:00.000Z",
  });
}

function makeOccurrenceRecord(): StoredRecord {
  return makeStoredRecord(OCCURRENCE_COLLECTION, OCCURRENCE_RKEY, {
    $type: OCCURRENCE_COLLECTION,
    scientificName: "Shorea leprosula",
    eventDate: "2026-02-01",
    decimalLatitude: "4.1234",
    decimalLongitude: "117.5678",
    basisOfRecord: "HumanObservation",
    occurrenceID: "tree-1",
    occurrenceStatus: "present",
    geodeticDatum: "EPSG:4326",
    license: "CC-BY-4.0",
    kingdom: "Plantae",
    datasetRef: DATASET_URI,
    createdAt: "2026-02-01T00:00:00.000Z",
  });
}

function makeFakeAgent(options: {
  photoCount: number;
  measurementCount?: number;
  datasetRecord?: Record<string, unknown>;
  occurrenceExists?: boolean;
  failDatasetUpdate?: boolean;
}): {
  agent: Agent;
  state: FakeAgentState;
} {
  const multimediaRecords = new Map(
    Array.from({ length: options.photoCount }, (_, index) => {
      const rkey = `photo-${index + 1}`;
      return [rkey, makeChildRecord(MULTIMEDIA_COLLECTION, rkey)] as const;
    }),
  );
  const measurementRecords = new Map(
    Array.from({ length: options.measurementCount ?? 0 }, (_, index) => {
      const rkey = `measurement-${index + 1}`;
      return [rkey, makeChildRecord(MEASUREMENT_COLLECTION, rkey)] as const;
    }),
  );
  const state: FakeAgentState = {
    datasetCid: "dataset-cid-0",
    datasetRecord: options.datasetRecord ?? {
      $type: DATASET_COLLECTION,
      name: "Target dataset",
      recordCount: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    occurrenceRecords:
      options.occurrenceExists === false
        ? new Map()
        : new Map([[OCCURRENCE_RKEY, makeOccurrenceRecord()]]),
    multimediaRecords,
    measurementRecords,
    applyWritesBatches: [],
  };

  function getCollectionRecords(collection: string): Map<string, StoredRecord> {
    if (collection === OCCURRENCE_COLLECTION) {
      return state.occurrenceRecords;
    }

    if (collection === MULTIMEDIA_COLLECTION) {
      return state.multimediaRecords;
    }

    if (collection === MEASUREMENT_COLLECTION) {
      return state.measurementRecords;
    }

    throw new Error(`Unexpected record collection ${collection}`);
  }

  const fakeAgent = {
    assertDid: DID,
    com: {
      atproto: {
        repo: {
          getRecord: async (input: { collection: string; rkey: string }) => {
            if (input.collection === DATASET_COLLECTION) {
              if (input.rkey !== DATASET_RKEY) {
                throw makeMissingRecordError();
              }

              return {
                data: {
                  uri: DATASET_URI,
                  cid: state.datasetCid,
                  value: state.datasetRecord,
                },
              };
            }

            const record = getCollectionRecords(input.collection).get(input.rkey);
            if (!record) {
              throw makeMissingRecordError();
            }

            return {
              data: {
                uri: record.uri,
                cid: record.cid,
                value: record.value,
              },
            };
          },
          listRecords: async (input: {
            collection: string;
            limit?: number;
            cursor?: string;
          }) => {
            const records = Array.from(
              getCollectionRecords(input.collection).values(),
            );
            const start = input.cursor ? Number(input.cursor) : 0;
            const limit = input.limit ?? records.length;
            const end = start + limit;

            return {
              data: {
                records: records.slice(start, end).map((record) => ({
                  uri: record.uri,
                  cid: record.cid,
                  value: record.value,
                })),
                cursor: end < records.length ? String(end) : undefined,
              },
            };
          },
          applyWrites: async (input: { writes: FakeApplyWrite[] }) => {
            if (input.writes.length > APPLY_WRITES_LIMIT) {
              throw new Error(`applyWrites exceeded ${APPLY_WRITES_LIMIT} writes.`);
            }

            if (
              options.failDatasetUpdate === true &&
              input.writes.some(
                (write) =>
                  write.$type === "com.atproto.repo.applyWrites#update" &&
                  write.collection === DATASET_COLLECTION,
              )
            ) {
              throw new Error("Dataset count update failed.");
            }

            state.applyWritesBatches.push(input.writes.map((write) => ({ ...write })));

            for (const write of input.writes) {
              if (write.$type === "com.atproto.repo.applyWrites#update") {
                if (write.collection !== DATASET_COLLECTION) {
                  throw new Error(`Unexpected update collection ${write.collection}`);
                }

                if (write.rkey !== DATASET_RKEY) {
                  throw new Error(`Unexpected dataset rkey ${write.rkey}`);
                }

                if (write.swapRecord !== state.datasetCid) {
                  throw new Error("Dataset update did not use the current CID.");
                }

                if (!write.value) {
                  throw new Error("Dataset update was missing a value.");
                }

                state.datasetRecord = write.value;
                state.datasetCid = `dataset-cid-${state.applyWritesBatches.length}`;
                continue;
              }

              if (write.$type !== "com.atproto.repo.applyWrites#delete") {
                throw new Error(`Unexpected write type ${write.$type}`);
              }

              getCollectionRecords(write.collection).delete(write.rkey);
            }

            return { data: { results: [] } };
          },
        },
      },
    },
  };

  return {
    agent: fakeAgent as unknown as Agent,
    state,
  };
}

async function runDeleteCascade(agent: Agent) {
  const layer = Layer.succeed(AtprotoAgent, agent);

  return Effect.runPromise(
    deleteDwcOccurrenceCascade({ rkey: OCCURRENCE_RKEY }).pipe(
      Effect.provide(layer),
    ),
  );
}

describe("deleteDwcOccurrenceCascade", () => {
  it("fails through the typed validation channel when the rkey is missing", async () => {
    const { agent, state } = makeFakeAgent({ photoCount: 0 });
    const layer = Layer.succeed(AtprotoAgent, agent);

    const result = await Effect.runPromise(
      deleteDwcOccurrenceCascade({ rkey: "" }).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DwcOccurrenceValidationError);
      expect(result.left.message).toBe("Tree occurrence rkey is required.");
    }
    expect(state.applyWritesBatches).toEqual([]);
  });

  it("fails before deleting when linked dataset data is invalid", async () => {
    const { agent, state } = makeFakeAgent({
      photoCount: 1,
      datasetRecord: {
        $type: DATASET_COLLECTION,
        name: "Target dataset",
        recordCount: "5",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const layer = Layer.succeed(AtprotoAgent, agent);

    const result = await Effect.runPromise(
      deleteDwcOccurrenceCascade({ rkey: OCCURRENCE_RKEY }).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DwcOccurrencePdsError);
      expect(result.left.message).toBe(
        "Linked dataset record is invalid; aborting tree deletion to preserve dataset counts.",
      );
    }
    expect(state.applyWritesBatches).toEqual([]);
    expect(state.multimediaRecords.size).toBe(1);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(true);
  });

  it("recounts legacy datasets missing recordCount before decrementing", async () => {
    const { agent, state } = makeFakeAgent({
      photoCount: 0,
      datasetRecord: {
        $type: DATASET_COLLECTION,
        name: "Target dataset",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    await runDeleteCascade(agent);

    expect(state.datasetRecord["recordCount"]).toBe(0);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(false);
  });

  it("keeps cascades at the applyWrites limit in a single batch", async () => {
    const { agent, state } = makeFakeAgent({ photoCount: 198 });

    await runDeleteCascade(agent);

    expect(state.applyWritesBatches.map((batch) => batch.length)).toEqual([
      APPLY_WRITES_LIMIT,
    ]);
    expect(state.applyWritesBatches[0]?.[0]?.collection).toBe(DATASET_COLLECTION);
    expect(state.applyWritesBatches[0]?.at(-1)?.collection).toBe(
      OCCURRENCE_COLLECTION,
    );
    expect(state.multimediaRecords.size).toBe(0);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(false);
    expect(state.datasetRecord["recordCount"]).toBe(4);
  });

  it("does not delete children when the oversized cascade parent delete fails", async () => {
    const { agent, state } = makeFakeAgent({
      photoCount: 201,
      failDatasetUpdate: true,
    });
    const layer = Layer.succeed(AtprotoAgent, agent);

    const result = await Effect.runPromise(
      deleteDwcOccurrenceCascade({ rkey: OCCURRENCE_RKEY }).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DwcOccurrencePdsError);
      expect(result.left.message).toBe(
        "Failed to delete the tree occurrence before deleting linked records.",
      );
    }
    expect(state.applyWritesBatches).toEqual([]);
    expect(state.multimediaRecords.size).toBe(201);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(true);
    expect(state.datasetRecord["recordCount"]).toBe(5);
  });

  it("resumes orphaned child cleanup when the occurrence was already deleted", async () => {
    const { agent, state } = makeFakeAgent({
      photoCount: 201,
      occurrenceExists: false,
    });

    const result = await runDeleteCascade(agent);

    expect(result.deletedMultimediaRkeys).toHaveLength(201);
    expect(result.deletedMeasurementRkeys).toEqual([]);
    expect(state.applyWritesBatches.map((batch) => batch.length)).toEqual([
      APPLY_WRITES_LIMIT,
      1,
    ]);
    expect(
      state.applyWritesBatches.flat().every(
        (write) =>
          write.$type === "com.atproto.repo.applyWrites#delete" &&
          write.collection === MULTIMEDIA_COLLECTION,
      ),
    ).toBe(true);
    expect(state.multimediaRecords.size).toBe(0);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(false);
    expect(state.datasetRecord["recordCount"]).toBe(5);
  });

  it("commits the occurrence delete before chunking children when the cascade exceeds the applyWrites limit", async () => {
    const { agent, state } = makeFakeAgent({ photoCount: 201 });

    const result = await runDeleteCascade(agent);

    expect(result.deletedMultimediaRkeys).toHaveLength(201);
    expect(result.deletedMeasurementRkeys).toEqual([]);
    expect(state.applyWritesBatches.map((batch) => batch.length)).toEqual([
      2,
      APPLY_WRITES_LIMIT,
      1,
    ]);
    expect(
      state.applyWritesBatches.every(
        (batch) => batch.length <= APPLY_WRITES_LIMIT,
      ),
    ).toBe(true);

    const parentBatch = state.applyWritesBatches[0];
    expect(
      parentBatch?.map((write) => `${write.$type}:${write.collection}:${write.rkey}`),
    ).toEqual([
      `com.atproto.repo.applyWrites#update:${DATASET_COLLECTION}:${DATASET_RKEY}`,
      `com.atproto.repo.applyWrites#delete:${OCCURRENCE_COLLECTION}:${OCCURRENCE_RKEY}`,
    ]);

    const childBatches = state.applyWritesBatches.slice(1).flat();
    expect(
      childBatches.every(
        (write) =>
          write.$type === "com.atproto.repo.applyWrites#delete" &&
          write.collection === MULTIMEDIA_COLLECTION,
      ),
    ).toBe(true);
    expect(state.multimediaRecords.size).toBe(0);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(false);
    expect(state.datasetRecord["recordCount"]).toBe(4);
  });
});
