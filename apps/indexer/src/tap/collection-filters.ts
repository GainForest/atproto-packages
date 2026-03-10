/**
 * Derives TAP_COLLECTION_FILTERS from INDEXED_COLLECTIONS.
 *
 * Converts specific collection NSIDs like:
 *   ["app.bumicerts.link.evm", "app.bumicerts.funding.config", "app.gainforest.organization.info"]
 *
 * Into wildcard patterns like:
 *   "app.bumicerts.*,app.gainforest.*"
 *
 * This ensures Tap and the indexer stay in sync automatically.
 */

import { INDEXED_COLLECTIONS } from "./collections.ts";

/**
 * Extract the namespace prefix from a collection NSID.
 * e.g., "app.bumicerts.link.evm" → "app.bumicerts"
 *       "org.hypercerts.claim.activity" → "org.hypercerts"
 */
function getNamespacePrefix(collection: string): string {
  const parts = collection.split(".");
  // Take first two segments: "app.bumicerts" or "org.hypercerts"
  return parts.slice(0, 2).join(".");
}

/**
 * Derive collection filter patterns from indexed collections.
 * Returns unique namespace wildcards sorted alphabetically.
 */
export function deriveCollectionFilters(): string[] {
  const prefixes = new Set<string>();

  for (const collection of INDEXED_COLLECTIONS) {
    prefixes.add(getNamespacePrefix(collection));
  }

  return Array.from(prefixes)
    .sort()
    .map((prefix) => `${prefix}.*`);
}

/**
 * Get the TAP_COLLECTION_FILTERS value as a comma-separated string.
 */
export function getCollectionFiltersString(): string {
  return deriveCollectionFilters().join(",");
}

// Allow running directly: bun run src/tap/collection-filters.ts
if (import.meta.main) {
  console.log(getCollectionFiltersString());
}
