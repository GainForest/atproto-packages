/**
 * Datasets query module.
 *
 * Scratch migration target:
 *   appGainforestDwcDataset(...) { edges { node { ... } } }
 */

import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query DatasetsByDid($did: String!, $first: Int, $after: String) {
    appGainforestDwcDataset(
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
          name
          description
          recordCount
          establishmentMeans
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
  query DatasetByUri($uri: String!) {
    appGainforestDwcDatasetByUri(uri: $uri) {
      did
      uri
      rkey
      cid
      createdAt
      name
      description
      recordCount
      establishmentMeans
    }
  }
`);

export type DatasetItem = {
  metadata: {
    did: string;
    uri: string;
    rkey: string;
    cid: string;
    createdAt: string | null;
  };
  record: {
    name: string;
    description: string | null;
    recordCount: number | null;
    establishmentMeans: string | null;
    createdAt: string | null;
  };
};

type DatasetNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestDwcDataset"]
>;
type DatasetByUriNode = NonNullable<
  ResultOf<typeof byUriDocument>["appGainforestDwcDatasetByUri"]
>;

export type Params = { did: string };
export type Result = DatasetItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeDataset(node: DatasetNode | DatasetByUriNode): DatasetItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      name: node.name,
      description: node.description,
      recordCount: node.recordCount,
      establishmentMeans: node.establishmentMeans,
      createdAt: node.createdAt,
    },
  } satisfies DatasetItem;
}

export async function fetch(params: Params): Promise<Result> {
  const allDatasets: DatasetItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });

    const datasets = res.appGainforestDwcDataset;
    allDatasets.push(...pluckConnectionNodes(datasets).map(normalizeDataset));

    const pageInfo = connectionPageInfo(datasets);
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Datasets query hit pagination safety cap for ${params.did}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allDatasets;
}

export async function fetchByUris(uris: string[]): Promise<Result> {
  const uniqueUris = Array.from(new Set(uris.filter((uri) => uri.length > 0)));
  const datasets = await Promise.all(
    uniqueUris.map(async (uri) => {
      const res = await graphqlClient.request(byUriDocument, { uri });
      return res.appGainforestDwcDatasetByUri
        ? normalizeDataset(res.appGainforestDwcDatasetByUri)
        : null;
    }),
  );

  return datasets.filter((item): item is DatasetItem => item !== null);
}
