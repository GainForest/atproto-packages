export interface ParsedAtUri {
  did: string;
  collection: string;
  rkey: string;
}

export function parseAtUri(uri: string): ParsedAtUri | null {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return null;
  }

  return {
    did: match[1],
    collection: match[2],
    rkey: match[3],
  };
}

export function isCertifiedLocationRecordUri(
  uri: string,
): uri is `at://did:plc:${string}/app.certified.location/${string}` {
  return /^at:\/\/did:plc:[a-z0-9]+\/app\.certified\.location\/[a-zA-Z0-9._:-]+$/.test(
    uri,
  );
}
