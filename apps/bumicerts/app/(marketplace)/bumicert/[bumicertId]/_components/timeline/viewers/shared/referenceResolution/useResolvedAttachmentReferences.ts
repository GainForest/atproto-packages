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
import { parseAtUri, type ParsedAtUri } from "./atUri";
import {
  buildResolvedReference,
  type ResolvedAttachmentReference,
} from "./referenceViewModel";
import {
  chunkDatasetRefLookupGroups,
  chunkReferenceLookupInputs,
} from "./referenceBatches";

export type AttachmentReferenceRequest = {
  key: string;
  content: unknown;
};

type ParsedUriLookup = {
  uri: string;
  parsed: ParsedAtUri | null;
};

function getAtUrisFromContent(content: unknown): string[] {
  const seenUris = new Set<string>();
  const uris: string[] = [];

  for (const item of parseAttachmentContent(content)) {
    if (item.kind !== "uri" || item.uriKind !== "at-uri") {
      continue;
    }

    if (seenUris.has(item.uri)) {
      continue;
    }

    seenUris.add(item.uri);
    uris.push(item.uri);
  }

  return uris;
}

function getReferencesByUri(args: {
  parsedUris: ParsedUriLookup[];
  audioByUri: Map<string, AudioRecordingItem>;
  occurrenceByUri: Map<string, OccurrenceItem>;
  datasetByUri: Map<string, DatasetItem>;
  occurrencesByDatasetUri: Map<string, OccurrenceItem[]>;
  locationByUri: Map<string, CertifiedLocation>;
}): Map<string, ResolvedAttachmentReference> {
  const referencesByUri = new Map<string, ResolvedAttachmentReference>();

  for (const { uri, parsed } of args.parsedUris) {
    referencesByUri.set(
      uri,
      buildResolvedReference({
        uri,
        parsed,
        audio: args.audioByUri.get(uri),
        occurrence: args.occurrenceByUri.get(uri),
        dataset: args.datasetByUri.get(uri),
        datasetOccurrences: args.occurrencesByDatasetUri.get(uri),
        location: args.locationByUri.get(uri),
      }),
    );
  }

  return referencesByUri;
}

export function useResolvedAttachmentReferenceMap(
  requests: AttachmentReferenceRequest[],
): {
  referencesByKey: Map<string, ResolvedAttachmentReference[]>;
  isLoading: boolean;
} {
  const lookupInput = useMemo(() => {
    const urisByKey = new Map<string, string[]>();
    const uniqueUris = new Set<string>();

    for (const request of requests) {
      const uris = getAtUrisFromContent(request.content);
      urisByKey.set(request.key, uris);
      for (const uri of uris) {
        uniqueUris.add(uri);
      }
    }

    return {
      urisByKey,
      atUris: Array.from(uniqueUris),
    };
  }, [requests]);

  const parsedUris = useMemo(
    () => lookupInput.atUris.map((uri) => ({ uri, parsed: parseAtUri(uri) })),
    [lookupInput.atUris],
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

  const locationRefs = useMemo(() => {
    const refsByUri = new Map<string, { uri: string; did: string; rkey: string }>();
    for (const { uri, parsed } of parsedUris) {
      if (parsed?.collection !== "app.certified.location") {
        continue;
      }

      refsByUri.set(uri, { uri, did: parsed.did, rkey: parsed.rkey });
    }

    return Array.from(refsByUri.values());
  }, [parsedUris]);

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

  const referencesByKey = useMemo(() => {
    const referencesByUri = getReferencesByUri({
      parsedUris,
      audioByUri,
      occurrenceByUri,
      datasetByUri,
      occurrencesByDatasetUri,
      locationByUri,
    });
    const map = new Map<string, ResolvedAttachmentReference[]>();

    for (const [key, uris] of lookupInput.urisByKey.entries()) {
      map.set(
        key,
        uris.flatMap((uri) => {
          const reference = referencesByUri.get(uri);
          return reference ? [reference] : [];
        }),
      );
    }

    return map;
  }, [
    audioByUri,
    datasetByUri,
    locationByUri,
    lookupInput.urisByKey,
    occurrenceByUri,
    occurrencesByDatasetUri,
    parsedUris,
  ]);

  const isLoading =
    audioQueries.some((query) => query.isLoading) ||
    occurrenceQueries.some((query) => query.isLoading) ||
    datasetQueries.some((query) => query.isLoading) ||
    datasetOccurrenceQueries.some((query) => query.isLoading) ||
    locationQueries.some((query) => query.isLoading);

  return { referencesByKey, isLoading };
}

export function useResolvedAttachmentReferences(content: unknown): {
  references: ResolvedAttachmentReference[];
  isLoading: boolean;
} {
  const requests = useMemo(
    () => [
      {
        key: "attachment",
        content,
      },
    ],
    [content],
  );
  const { referencesByKey, isLoading } =
    useResolvedAttachmentReferenceMap(requests);

  return {
    references: referencesByKey.get("attachment") ?? [],
    isLoading,
  };
}
