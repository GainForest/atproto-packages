import { describe, expect, it } from "bun:test";
import type { Agent } from "@atproto/api";
import { Effect, Layer } from "effect";
import { AtprotoAgent } from "../../../services/AtprotoAgent";
import { deleteDwcOccurrenceCascade } from "../deleteCascade";

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

function makeFakeAgent(options: { photoCount: number; measurementCount?: number }): {
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
    datasetRecord: {
      $type: DATASET_COLLECTION,
      name: "Target dataset",
      recordCount: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    occurrenceRecords: new Map([[OCCURRENCE_RKEY, makeOccurrenceRecord()]]),
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

  it("chunks child deletes before the final occurrence delete when the cascade exceeds the applyWrites limit", async () => {
    const { agent, state } = makeFakeAgent({ photoCount: 201 });

    const result = await runDeleteCascade(agent);

    expect(result.deletedMultimediaRkeys).toHaveLength(201);
    expect(result.deletedMeasurementRkeys).toEqual([]);
    expect(state.applyWritesBatches.map((batch) => batch.length)).toEqual([
      APPLY_WRITES_LIMIT,
      1,
      2,
    ]);
    expect(
      state.applyWritesBatches.every(
        (batch) => batch.length <= APPLY_WRITES_LIMIT,
      ),
    ).toBe(true);

    const childBatches = state.applyWritesBatches.slice(0, -1).flat();
    expect(
      childBatches.every(
        (write) =>
          write.$type === "com.atproto.repo.applyWrites#delete" &&
          write.collection === MULTIMEDIA_COLLECTION,
      ),
    ).toBe(true);

    const finalBatch = state.applyWritesBatches.at(-1);
    expect(
      finalBatch?.map((write) => `${write.$type}:${write.collection}:${write.rkey}`),
    ).toEqual([
      `com.atproto.repo.applyWrites#update:${DATASET_COLLECTION}:${DATASET_RKEY}`,
      `com.atproto.repo.applyWrites#delete:${OCCURRENCE_COLLECTION}:${OCCURRENCE_RKEY}`,
    ]);
    expect(state.multimediaRecords.size).toBe(0);
    expect(state.occurrenceRecords.has(OCCURRENCE_RKEY)).toBe(false);
    expect(state.datasetRecord["recordCount"]).toBe(4);
  });
});
