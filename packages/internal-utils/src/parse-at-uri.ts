export type AtUri = {
  did: string;
  collection: string;
  rkey: string;
};

export function parseAtUri(atUri: string): AtUri {
  const parts = atUri.replace("at://", "").split("/");
  return {
    did: parts[0] ?? "",
    collection: parts[1] ?? "",
    rkey: parts[2] ?? "self",
  };
}
