/**
 * ATProto Mutations Utilities (Client-Safe)
 *
 * Re-exports from @gainforest/atproto-mutations-next that are safe to use
 * in both client and server components. No server-only dependencies.
 */

// Re-export useful types and utilities
export { MutationError } from "@gainforest/atproto-mutations-next/client";
export {
  toSerializableFile,
  parseAtUri,
  computePolygonMetrics,
} from "@gainforest/atproto-mutations-next";
export type { PolygonMetrics } from "@gainforest/atproto-mutations-core";
export type { AtUri } from "@gainforest/internal-utils";
export type { SerializableFile, FileOrBlobRef } from "@gainforest/atproto-mutations-core";
