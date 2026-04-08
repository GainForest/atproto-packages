/**
 * Extracts a CID string from a blob reference, handling both:
 * - Raw JSON wire format returned by public PDS API:
 *   `{ $type: "blob", ref: { $link: "bafkrei..." }, mimeType: "...", size: N }`
 * - BlobRef class instances from `@atproto/api` Agent:
 *   `{ ref: <CID object with .toString()> }`
 * - Objects with a direct `cid` string property (internal use)
 *
 * Returns `null` if the CID cannot be extracted.
 */
export function extractCid(image: unknown): string | null {
  if (!image || typeof image !== "object") return null;
  const obj = image as Record<string, unknown>;

  // Direct string ref: { ref: "bafkrei..." }
  if (typeof obj.ref === "string" && obj.ref.length > 0) {
    return obj.ref;
  }

  // Raw JSON wire format: { ref: { $link: "bafkrei..." } }
  if (
    obj.ref &&
    typeof obj.ref === "object" &&
    (obj.ref as Record<string, unknown>).$link
  ) {
    return (obj.ref as Record<string, unknown>).$link as string;
  }

  // BlobRef class instance: ref is a CID object with .toString()
  if (
    obj.ref &&
    typeof (obj.ref as { toString?: unknown }).toString === "function"
  ) {
    const str = String(obj.ref);
    if (str && !str.startsWith("[object")) return str;
  }

  // Direct cid property (internal staging format)
  if (typeof obj.cid === "string") return obj.cid;

  return null;
}

/**
 * Build the URL used to fetch a blob from an ATProto PDS.
 *
 * @param pdsUrl  - Base URL of the PDS, e.g. `"https://bsky.social"`
 * @param did     - DID of the repo that owns the blob
 * @param cid     - CID of the blob
 */
export function buildBlobUrl(pdsUrl: string, did: string, cid: string): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}

/**
 * Extract the best available image URL from a blob reference.
 *
 * Handles three cases in priority order:
 * 1. Indexer-resolved blob: `{ uri: "https://pds.example/xrpc/..." }` — use directly
 * 2. Raw CID: call `resolveImageUrl(cid)` to build the URL
 * 3. No useful data: return `null`
 *
 * This allows the same renderer to work with both indexer-returned data
 * (where blobs have a pre-resolved `uri`) and raw PDS data (where you need to
 * build the URL yourself via `resolveImageUrl`).
 */
export function extractBlobImageUrl(
  image: unknown,
  resolveImageUrl: (cid: string) => string
): string | null {
  if (!image || typeof image !== "object") return null;
  const obj = image as Record<string, unknown>;

  // Case 1: Indexer pre-resolved the blob — use the uri directly
  if (typeof obj.uri === "string" && obj.uri && !obj.uri.includes("unknown.invalid")) {
    return obj.uri;
  }

  // Case 2: Extract the CID and resolve via the callback
  const cid = extractCid(image);
  if (cid) return resolveImageUrl(cid);

  return null;
}
