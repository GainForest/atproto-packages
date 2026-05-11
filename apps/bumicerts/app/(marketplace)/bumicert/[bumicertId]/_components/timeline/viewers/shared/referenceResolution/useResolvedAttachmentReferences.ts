import { useMemo } from "react";
import type {
  AudioRecordingItem,
  CertifiedLocation,
  DatasetItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { parseAttachmentContent } from "../../../shared/attachmentContentParser";
import {
  getOccurrenceDatasetRef,
  isMeasuredTreeOccurrence,
} from "../../../shared/occurrenceEvidenceClassification";
import { parseAtUri } from "./atUri";
import {
  buildResolvedReference,
  type ResolvedAttachmentReference,
} from "./referenceViewModel";
import {
  chunkDatasetRefLookupGroups,
  chunkReferenceLookupInputs,
} from "./referenceBatches";

export function useResolvedAttachmentReferences(content: unknown): {
  references: ResolvedAttachmentReference[];
  isLoading: boolean;
} {
  const atUris = useMemo(() => {
    const parsedItems = parseAttachmentContent(content);
    const uris = parsedItems.flatMap((item) =>
      item.kind === "uri" && item.uriKind === "at-uri" ? [item.uri] : [],
    );
    return Array.from(new Set(uris));
  }, [content]);

  const parsedUris = useMemo(
    () => atUris.map((uri) => ({ uri, parsed: parseAtUri(uri) })),
    [atUris],
  );

  const audioUris = useMemo(
    () =>
      parsedUris.flatMap(({ uri, parsed }) =>
        parsed?.collection === "app.gainforest.ac.audio" ? [uri] : [],
      ),
    [parsedUris],
  );

  const occurrenceUris = useMemo(
    () =>
      parsedUris.flatMap(({ uri, parsed }) =>
        parsed?.collection === "app.gainforest.dwc.occurrence" ? [uri] : [],
      ),
    [parsedUris],
  );

  const datasetUris = useMemo(
    () =>
      parsedUris.flatMap(({ uri, parsed }) =>
        parsed?.collection === "app.gainforest.dwc.dataset" ? [uri] : [],
      ),
    [parsedUris],
  );

  const datasetRefGroups = useMemo(() => {
    const grouped = new Map<string, Set<string>>();
    for (const { uri, parsed } of parsedUris) {
      if (parsed?.collection !== "app.gainforest.dwc.dataset") {
        continue;
      }

      const refs = grouped.get(parsed.did) ?? new Set<string>();
      refs.add(uri);
      grouped.set(parsed.did, refs);
    }

    return Array.from(grouped.entries()).map(([did, refs]) => ({
      did,
      datasetRefs: Array.from(refs),
    }));
  }, [parsedUris]);

  const locationRefs = useMemo(
    () =>
      parsedUris.flatMap(({ uri, parsed }) =>
        parsed?.collection === "app.certified.location"
          ? [{ uri, did: parsed.did, rkey: parsed.rkey }]
          : [],
      ),
    [parsedUris],
  );

  const audioUriBatches = useMemo(
    () => chunkReferenceLookupInputs(audioUris),
    [audioUris],
  );
  const occurrenceUriBatches = useMemo(
    () => chunkReferenceLookupInputs(occurrenceUris),
    [occurrenceUris],
  );
  const datasetUriBatches = useMemo(
    () => chunkReferenceLookupInputs(datasetUris),
    [datasetUris],
  );
  const datasetRefBatches = useMemo(
    () => chunkDatasetRefLookupGroups(datasetRefGroups),
    [datasetRefGroups],
  );

  const audioQueries = indexerTrpc.useQueries((t) =>
    audioUriBatches.map((uris) => t.audio.byUris({ uris })),
  );
  const occurrenceQueries = indexerTrpc.useQueries((t) =>
    occurrenceUriBatches.map((uris) => t.dwc.occurrencesByUris({ uris })),
  );
  const datasetQueries = indexerTrpc.useQueries((t) =>
    datasetUriBatches.map((uris) => t.datasets.byUris({ uris })),
  );
  const datasetOccurrenceQueries = indexerTrpc.useQueries((t) =>
    datasetRefBatches.map((group) =>
      t.dwc.occurrencesByDatasetRefs({
        did: group.did,
        datasetRefs: group.datasetRefs,
      }),
    ),
  );
  const locationQueries = indexerTrpc.useQueries((t) =>
    locationRefs.map((ref) => t.locations.list({ did: ref.did, rkey: ref.rkey })),
  );

  const audioByUri = useMemo(() => {
    const map = new Map<string, AudioRecordingItem>();
    for (const query of audioQueries) {
      for (const item of query.data ?? []) {
        const uri = item.metadata?.uri;
        if (uri) {
          map.set(uri, item);
        }
      }
    }
    return map;
  }, [audioQueries]);

  const occurrenceByUri = useMemo(() => {
    const map = new Map<string, OccurrenceItem>();
    for (const query of occurrenceQueries) {
      for (const item of query.data ?? []) {
        const uri = item.metadata?.uri;
        if (uri) {
          map.set(uri, item);
        }
      }
    }
    return map;
  }, [occurrenceQueries]);

  const occurrencesByDatasetUri = useMemo(() => {
    const map = new Map<string, OccurrenceItem[]>();
    for (const query of datasetOccurrenceQueries) {
      for (const item of query.data ?? []) {
        if (!isMeasuredTreeOccurrence(item)) {
          continue;
        }

        const datasetRef = getOccurrenceDatasetRef(item);
        if (!datasetRef) {
          continue;
        }

        const current = map.get(datasetRef) ?? [];
        current.push(item);
        map.set(datasetRef, current);
      }
    }
    return map;
  }, [datasetOccurrenceQueries]);

  const datasetByUri = useMemo(() => {
    const map = new Map<string, DatasetItem>();
    for (const query of datasetQueries) {
      for (const item of query.data ?? []) {
        const uri = item.metadata?.uri;
        if (uri) {
          map.set(uri, item);
        }
      }
    }
    return map;
  }, [datasetQueries]);

  const locationByUri = useMemo(() => {
    const map = new Map<string, CertifiedLocation>();
    locationRefs.forEach((ref, index) => {
      const first = locationQueries[index]?.data?.[0];
      if (first) {
        map.set(ref.uri, first);
      }
    });
    return map;
  }, [locationQueries, locationRefs]);

  const references = useMemo<ResolvedAttachmentReference[]>(() => {
    return parsedUris.map(({ uri, parsed }) => {
      return buildResolvedReference({
        uri,
        parsed,
        audio: audioByUri.get(uri),
        occurrence: occurrenceByUri.get(uri),
        dataset: datasetByUri.get(uri),
        datasetOccurrences: occurrencesByDatasetUri.get(uri),
        location: locationByUri.get(uri),
      });
    });
  }, [audioByUri, datasetByUri, locationByUri, occurrenceByUri, occurrencesByDatasetUri, parsedUris]);

  const isLoading =
    audioQueries.some((query) => query.isLoading) ||
    occurrenceQueries.some((query) => query.isLoading) ||
    datasetQueries.some((query) => query.isLoading) ||
    datasetOccurrenceQueries.some((query) => query.isLoading) ||
    locationQueries.some((query) => query.isLoading);

  return { references, isLoading };
}
