/**
 * datasets query procedure
 *
 * trpc.datasets.list({ did }) → DatasetItem[]
 */

import { z } from "zod";
import { queryRouter, publicQueryProcedure } from "./init";
import * as datasetsModule from "@/graphql/indexer/queries/datasets";

export const datasetsRouter = queryRouter({
  list: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => datasetsModule.fetch({ did: input.did })),
  byUris: publicQueryProcedure
    .input(z.object({ uris: z.array(z.string().min(1)).max(100) }))
    .query(({ input }) => datasetsModule.fetchByUris(input.uris)),
});
