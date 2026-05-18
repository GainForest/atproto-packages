/**
 * audio query procedure
 *
 * trpc.audio.list({ did }) → AudioRecordingItem[]
 */

import { z } from "zod";
import { INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT } from "../reference-limits";
import { queryRouter, publicQueryProcedure } from "./init";
import * as audioModule from "@/graphql/indexer/queries/audio";
import * as audioEventsModule from "@/graphql/indexer/queries/audio/events";
import * as audioDeploymentsModule from "@/graphql/indexer/queries/audio/deployments";

export const audioRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => audioModule.fetch({ did: input.did })),
  byUris: publicQueryProcedure
    .input(z.object({
      uris: z.array(z.string().min(1)).max(INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT),
    }))
    .query(({ input }) => audioModule.fetchByUris(input.uris)),
  events: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => audioEventsModule.fetch({ did: input.did })),
  deployments: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => audioDeploymentsModule.fetch({ did: input.did })),
});
