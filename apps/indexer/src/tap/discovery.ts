/**
 * Network-wide DID discovery via com.atproto.sync.listReposByCollection.
 *
 * Queries the relay to find all DIDs that have ever created records with
 * specific collection NSIDs. Used for complete historical backfilling of
 * custom lexicons without needing to know DIDs or PDS hosts in advance.
 */

const DISCOVERY_LIMIT = 500; // Max repos per page (relay limit)
const PAGE_DELAY_MS = 500; // Delay between pages to avoid rate limits
const MAX_RETRIES = 3; // Retry failed requests

interface ListReposByCollectionResponse {
  repos: Array<{ did: string }>;
  cursor?: string;
}

/**
 * Discover all DIDs for a single collection NSID.
 * Paginates automatically until all results are retrieved.
 *
 * @param relayUrl - Relay base URL (e.g., https://bsky.network)
 * @param collection - Collection NSID (e.g., org.hypercerts.claim.activity)
 * @returns Array of unique DIDs
 * @throws Error if relay is unreachable after retries (strict mode)
 */
export async function discoverDidsByCollection(
  relayUrl: string,
  collection: string
): Promise<string[]> {
  // Normalize URL: strip trailing slash
  const base = relayUrl.replace(/\/+$/, "");
  const url = `${base}/xrpc/com.atproto.sync.listReposByCollection`;

  const dids: string[] = [];
  let cursor: string | undefined;
  let page = 0;

  console.log(`  [discovery] Querying ${collection}...`);

  do {
    const params = new URLSearchParams({
      collection,
      limit: String(DISCOVERY_LIMIT),
    });
    if (cursor) params.set("cursor", cursor);

    // Retry logic with exponential backoff
    let attempt = 0;
    let success = false;
    let body: ListReposByCollectionResponse | null = null;

    while (!success && attempt < MAX_RETRIES) {
      try {
        const res = await fetch(`${url}?${params}`, {
          signal: AbortSignal.timeout(30_000), // 30s timeout
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        body = (await res.json()) as ListReposByCollectionResponse;
        success = true;
      } catch (err) {
        attempt++;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (attempt >= MAX_RETRIES) {
          // Strict mode: fail startup if discovery fails
          throw new Error(
            `Failed to discover DIDs for ${collection} after ${MAX_RETRIES} attempts: ${errorMsg}`
          );
        }

        console.warn(
          `  [discovery] Retry ${attempt}/${MAX_RETRIES} for ${collection} (error: ${errorMsg})`
        );

        // Exponential backoff: 1s, 2s, 4s...
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }

    if (!body) {
      throw new Error(
        `Unexpected: no response body for ${collection} after retries`
      );
    }

    const pageDids = (body.repos ?? []).map((r) => r.did);
    dids.push(...pageDids);
    cursor = body.cursor;
    page++;

    console.log(
      `  [discovery]   page ${page}: ${pageDids.length} DIDs (total: ${dids.length})`
    );

    // Rate limiting: delay between pages to avoid overwhelming relay
    if (cursor) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }
  } while (cursor);

  console.log(
    `  [discovery] ${collection} — done. ${dids.length} DIDs found.`
  );
  return dids;
}

/**
 * Discover DIDs for multiple collections and return deduplicated results.
 * Collections are queried sequentially to avoid overwhelming the relay.
 *
 * @param relayUrl - Relay base URL (e.g., https://bsky.network)
 * @param collections - Array of collection NSIDs
 * @returns Array of unique DIDs across all collections
 * @throws Error if any collection discovery fails (strict mode)
 */
export async function discoverDidsByCollections(
  relayUrl: string,
  collections: string[]
): Promise<string[]> {
  if (collections.length === 0) return [];

  const allDids = new Set<string>();

  // Query collections sequentially to avoid overwhelming relay
  for (const collection of collections) {
    const dids = await discoverDidsByCollection(relayUrl, collection);
    dids.forEach((did) => allDids.add(did));
  }

  return Array.from(allDids);
}
