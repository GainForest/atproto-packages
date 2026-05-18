import { graphql, graphqlClient, type ResultOf } from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query AudioEventsByDid($did: String!, $first: Int, $after: String) {
    appGainforestDwcEvent(
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
          eventID
          eventDate
          eventTime
          habitat
          samplingProtocol
          samplingEffort
          fieldNotes
          eventRemarks
          decimalLatitude
          decimalLongitude
          geodeticDatum
          coordinateUncertaintyInMeters
          country
          countryCode
          stateProvince
          county
          municipality
          locality
          minimumElevationInMeters
          maximumElevationInMeters
          locationRemarks
          monitoringProgramme
          monitoringFrequency
          temperature
          humidity
          windSpeed
          cloudCover
          precipitation
          weatherRemarks
          moonPhase
          teamSize
          recordedBy
          equipmentUsed
          qualityControlNotes
          completeness
        }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`);

type EventNode = ConnectionNode<ResultOf<typeof document>["appGainforestDwcEvent"]>;

export type AudioEventItem = {
  metadata: { did: string; uri: string; rkey: string; cid: string };
  record: Omit<EventNode, "did" | "uri" | "rkey" | "cid">;
};

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

function normalizeEvent(node: EventNode): AudioEventItem {
  const { did, uri, rkey, cid, ...record } = node;
  return { metadata: { did, uri, rkey, cid }, record };
}

export async function fetch(params: { did: string }): Promise<AudioEventItem[]> {
  const allEvents: AudioEventItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await graphqlClient.request(document, {
      did: params.did,
      first: PAGE_SIZE,
      after: cursor,
    });
    const connection = res.appGainforestDwcEvent;
    allEvents.push(...pluckConnectionNodes(connection).map(normalizeEvent));

    const pageInfo = connectionPageInfo(connection);
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
      cursor = pageInfo.endCursor;
      continue;
    }
    break;
  }

  return allEvents;
}
