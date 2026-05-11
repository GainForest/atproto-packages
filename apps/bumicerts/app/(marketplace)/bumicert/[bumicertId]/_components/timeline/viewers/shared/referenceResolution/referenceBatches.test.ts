import { describe, expect, test } from "bun:test";
import { INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT } from "@/lib/trpc/reference-limits";
import {
  chunkDatasetRefLookupGroups,
  chunkReferenceLookupInputs,
} from "./referenceBatches";

describe("reference lookup batches", () => {
  test("chunks reference inputs to the indexer lookup limit", () => {
    const values = Array.from(
      { length: INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT * 2 + 1 },
      (_, index) => `uri-${index}`,
    );

    const chunks = chunkReferenceLookupInputs(values);

    expect(chunks.map((chunk) => chunk.length)).toEqual([
      INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT,
      INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT,
      1,
    ]);
    expect(chunks.flat()).toEqual(values);
  });

  test("chunks dataset ref groups per DID", () => {
    const did = "did:plc:trees";
    const datasetRefs = Array.from(
      { length: INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT + 1 },
      (_, index) => `at://${did}/app.gainforest.dwc.dataset/dataset-${index}`,
    );

    const groups = chunkDatasetRefLookupGroups([
      { did, datasetRefs },
      {
        did: "did:plc:other",
        datasetRefs: ["at://did:plc:other/app.gainforest.dwc.dataset/dataset-1"],
      },
    ]);

    expect(groups.map((group) => [group.did, group.datasetRefs.length])).toEqual([
      [did, INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT],
      [did, 1],
      ["did:plc:other", 1],
    ]);
    expect(groups.flatMap((group) => group.datasetRefs)).toEqual([
      ...datasetRefs,
      "at://did:plc:other/app.gainforest.dwc.dataset/dataset-1",
    ]);
  });
});
