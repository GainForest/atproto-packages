import { INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT } from "@/lib/trpc/reference-limits";

export type DatasetRefLookupGroup = {
  did: string;
  datasetRefs: string[];
};

type DatasetRefLookupInputGroup = {
  did: string;
  datasetRefs: readonly string[];
};

export function chunkReferenceLookupInputs<T>(items: readonly T[]): T[][] {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT
  ) {
    chunks.push(items.slice(index, index + INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT));
  }

  return chunks;
}

export function chunkDatasetRefLookupGroups(
  groups: readonly DatasetRefLookupInputGroup[],
): DatasetRefLookupGroup[] {
  return groups.flatMap((group) =>
    chunkReferenceLookupInputs(group.datasetRefs).map((datasetRefs) => ({
      did: group.did,
      datasetRefs,
    })),
  );
}
