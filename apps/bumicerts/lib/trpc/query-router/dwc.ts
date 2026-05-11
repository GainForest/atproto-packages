/**
 * dwc read procedures
 *
 * trpc.dwc.occurrences({ did })  → OccurrenceItem[]
 * trpc.dwc.measurements({ did }) → MeasurementItem[]
 *
 * Slots into the existing `dwc` namespace alongside the
 * occurrence.create and measurement.create mutations from the package router.
 * Uses `occurrences` (plural) to distinguish from the `occurrence` entity router.
 */

import { z } from "zod";
import { INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT } from "../reference-limits";
import { queryRouter, publicQueryProcedure } from "./init";
import * as occurrencesModule from "@/graphql/indexer/queries/occurrences";
import * as measurementsModule from "@/graphql/indexer/queries/measurements";

export const dwcQueryRouter = queryRouter({
  occurrences: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => occurrencesModule.fetch({ did: input.did })),
  occurrencesByUris: publicQueryProcedure
    .input(z.object({
      uris: z.array(z.string().min(1)).max(INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT),
    }))
    .query(({ input }) => occurrencesModule.fetchByUris(input.uris)),
  occurrencesByDatasetRefs: publicQueryProcedure
    .input(z.object({
      did: z.string().min(1),
      datasetRefs: z
        .array(z.string().min(1))
        .max(INDEXER_REFERENCE_LOOKUP_BATCH_LIMIT),
    }))
    .query(({ input }) => occurrencesModule.fetchByDatasetRefs(input)),
  measurements: publicQueryProcedure
    .input(z.object({ did: z.string().min(1) }))
    .query(({ input }) => measurementsModule.fetch({ did: input.did })),
});
