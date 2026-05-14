/**
 * Occurrences query module.
 *
 * Fetches all `app.gainforest.dwc.occurrence` records authored by a given DID.
 * Used in the evidence picker and Tree Manager to read full tree/species lists.
 *
 * Leaf: queries.occurrences
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query OccurrencesByDid($did: String!, $first: Int, $after: String) {
    appGainforestDwcOccurrence(
      where: { did: { eq: $did } }
      first: $first
      after: $after
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          scientificName
          vernacularName
          kingdom
          individualCount
          organismQuantity
          eventDate
          datasetName
          decimalLatitude
          decimalLongitude
          recordedBy
          country
          countryCode
          stateProvince
          locality
          occurrenceRemarks
          habitat
          basisOfRecord
          dynamicProperties
          datasetRef
          siteRef
          thumbnailUrl
          speciesImageUrl
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`);

const byUriDocument = graphql(`
  query OccurrenceByUri($uri: String!) {
    appGainforestDwcOccurrenceByUri(uri: $uri) {
      did
      uri
      rkey
      cid
      createdAt
      scientificName
      vernacularName
      kingdom
      individualCount
      organismQuantity
      eventDate
      datasetName
      decimalLatitude
      decimalLongitude
      recordedBy
      country
      countryCode
      stateProvince
      locality
      occurrenceRemarks
      habitat
      basisOfRecord
      dynamicProperties
      datasetRef
      siteRef
      thumbnailUrl
      speciesImageUrl
    }
  }
`);

const byDatasetRefDocument = graphql(`
  query OccurrencesByDatasetRef(
    $did: String!
    $datasetRef: String!
    $first: Int
    $after: String
  ) {
    appGainforestDwcOccurrence(
      where: { did: { eq: $did }, datasetRef: { eq: $datasetRef } }
      first: $first
      after: $after
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          scientificName
          vernacularName
          kingdom
          individualCount
          organismQuantity
          eventDate
          datasetName
          decimalLatitude
          decimalLongitude
          recordedBy
          country
          countryCode
          stateProvince
          locality
          occurrenceRemarks
          habitat
          basisOfRecord
          dynamicProperties
          datasetRef
          siteRef
          thumbnailUrl
          speciesImageUrl
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`);

const bySiteRefDocument = graphql(`
  query OccurrencesBySiteRef(
    $did: String!
    $siteRef: String!
    $first: Int
    $after: String
  ) {
    appGainforestDwcOccurrence(
      where: { did: { eq: $did }, siteRef: { eq: $siteRef } }
      first: $first
      after: $after
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          scientificName
          vernacularName
          kingdom
          individualCount
          organismQuantity
          eventDate
          datasetName
          decimalLatitude
          decimalLongitude
          recordedBy
          country
          countryCode
          stateProvince
          locality
          occurrenceRemarks
          habitat
          basisOfRecord
          dynamicProperties
          datasetRef
          siteRef
          thumbnailUrl
          speciesImageUrl
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`);

export type OccurrenceItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
  };
  record: {
    scientificName: string | null;
    vernacularName: string | null;
    kingdom: string | null;
    individualCount: number | null;
    organismQuantity: string | null;
    eventDate: string | null;
    datasetName: string | null;
    decimalLatitude: string | null;
    decimalLongitude: string | null;
    recordedBy: string | null;
    country: string | null;
    countryCode: string | null;
    stateProvince: string | null;
    locality: string | null;
    occurrenceRemarks: string | null;
    habitat: string | null;
    basisOfRecord: string | null;
    dynamicProperties: string | null;
    /** TODO(graphql-migration): temporary establishmentMeans shim; remove when the query path supports it or upload UI stops depending on it. */
    establishmentMeans: string | null;
    datasetRef: string | null;
    siteRef: string | null;
    thumbnailUrl: string | null;
    speciesImageUrl: string | null;
    createdAt: string | null;
  };
};

type OccurrenceNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestDwcOccurrence"]
>;
type OccurrenceByUriNode = NonNullable<
  ResultOf<typeof byUriDocument>["appGainforestDwcOccurrenceByUri"]
>;
type OccurrenceByDatasetRefNode = ConnectionNode<
  ResultOf<typeof byDatasetRefDocument>["appGainforestDwcOccurrence"]
>;
type OccurrenceBySiteRefNode = ConnectionNode<
  ResultOf<typeof bySiteRefDocument>["appGainforestDwcOccurrence"]
>;

export type Params = { did: string };
export type Result = OccurrenceItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeOccurrence(
  node:
    | OccurrenceNode
    | OccurrenceByUriNode
    | OccurrenceByDatasetRefNode
    | OccurrenceBySiteRefNode,
): OccurrenceItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      scientificName: node.scientificName,
      vernacularName: node.vernacularName,
      kingdom: node.kingdom,
      individualCount: node.individualCount,
      organismQuantity: node.organismQuantity,
      eventDate: node.eventDate,
      datasetName: node.datasetName,
      decimalLatitude: node.decimalLatitude,
      decimalLongitude: node.decimalLongitude,
      recordedBy: node.recordedBy,
      country: node.country,
      countryCode: node.countryCode,
      stateProvince: node.stateProvince,
      locality: node.locality,
      occurrenceRemarks: node.occurrenceRemarks,
      habitat: node.habitat,
      basisOfRecord: node.basisOfRecord,
      dynamicProperties: node.dynamicProperties,
      // TODO(graphql-migration): temporary establishmentMeans shim; remove when the query path supports it or upload UI stops depending on it.
      establishmentMeans: null,
      datasetRef: node.datasetRef,
      siteRef: node.siteRef,
      thumbnailUrl: node.thumbnailUrl,
      speciesImageUrl: node.speciesImageUrl,
      createdAt: node.createdAt,
    },
  } satisfies OccurrenceItem;
}

export async function fetch(params: Params): Promise<Result> {
  const allOccurrences: OccurrenceItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });

    const occurrence = res.appGainforestDwcOccurrence;
    allOccurrences.push(...pluckConnectionNodes(occurrence).map(normalizeOccurrence));

    const pageInfo = connectionPageInfo(occurrence);
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Occurrences query hit pagination safety cap for ${params.did}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allOccurrences;
}

export async function fetchByUris(uris: string[]): Promise<Result> {
  const uniqueUris = Array.from(new Set(uris.filter((uri) => uri.length > 0)));
  const occurrences = await Promise.all(
    uniqueUris.map(async (uri) => {
      const res = await graphqlClient.request(byUriDocument, { uri });
      return res.appGainforestDwcOccurrenceByUri
        ? normalizeOccurrence(res.appGainforestDwcOccurrenceByUri)
        : null;
    }),
  );

  return occurrences.filter((item): item is OccurrenceItem => item !== null);
}

async function fetchByDatasetRef(did: string, datasetRef: string): Promise<Result> {
  const allOccurrences: OccurrenceItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(byDatasetRefDocument, {
      did,
      datasetRef,
      first: PAGE_SIZE,
      after: cursor,
    });

    const occurrence = res.appGainforestDwcOccurrence;
    allOccurrences.push(...pluckConnectionNodes(occurrence).map(normalizeOccurrence));

    const pageInfo = connectionPageInfo(occurrence);
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Occurrences query hit pagination safety cap for ${datasetRef}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allOccurrences;
}

export async function fetchBySiteRef(params: {
  did: string;
  siteRef: string;
}): Promise<Result> {
  const allOccurrences: OccurrenceItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(bySiteRefDocument, {
      did: params.did,
      siteRef: params.siteRef,
      first: PAGE_SIZE,
      after: cursor,
    });

    const occurrence = res.appGainforestDwcOccurrence;
    allOccurrences.push(...pluckConnectionNodes(occurrence).map(normalizeOccurrence));

    const pageInfo = connectionPageInfo(occurrence);
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Occurrences query hit pagination safety cap for ${params.siteRef}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allOccurrences;
}

export async function fetchByDatasetRefs(params: {
  did: string;
  datasetRefs: string[];
}): Promise<Result> {
  const uniqueDatasetRefs = Array.from(
    new Set(params.datasetRefs.filter((datasetRef) => datasetRef.length > 0)),
  );
  const grouped = await Promise.all(
    uniqueDatasetRefs.map((datasetRef) => fetchByDatasetRef(params.did, datasetRef)),
  );

  return grouped.flat();
}
