import { graphql, graphqlClient, type ResultOf } from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query AudioDeploymentsByDid($did: String!, $first: Int, $after: String) {
    appGainforestAcDeployment(
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
          deviceModel
          deviceSerialNumber
          firmwareVersion
          gain
          recordingSchedule
          sampleRateHz
          microphoneType
          mountingHeight
          mountingOrientation
          batteryType
          storageMedia
          deployedAt
          retrievedAt
          decimalLatitude
          decimalLongitude
          altitude
          habitat
          eventRef
          siteRef
          remarks
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`);

type DeploymentNode = ConnectionNode<ResultOf<typeof document>["appGainforestAcDeployment"]>;

export type AudioDeploymentItem = {
  metadata: { did: string; uri: string; rkey: string; cid: string };
  record: Omit<DeploymentNode, "did" | "uri" | "rkey" | "cid">;
};

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeDeployment(node: DeploymentNode): AudioDeploymentItem {
  const { did, uri, rkey, cid, ...record } = node;
  return { metadata: { did, uri, rkey, cid }, record };
}

export async function fetch(params: { did: string }): Promise<AudioDeploymentItem[]> {
  const allDeployments: AudioDeploymentItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });
    const connection = res.appGainforestAcDeployment;
    allDeployments.push(...pluckConnectionNodes(connection).map(normalizeDeployment));

    const pageInfo = connectionPageInfo(connection);
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      cursor = pageInfo.endCursor;
      continue;
    }
    break;
  }

  return allDeployments;
}
