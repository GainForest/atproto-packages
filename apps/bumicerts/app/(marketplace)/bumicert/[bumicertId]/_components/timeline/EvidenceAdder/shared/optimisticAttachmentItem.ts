import type { BumicertsLeafletEditorProps } from "@/components/ui/leaflet-editor";
import type { AttachmentItem } from "@/lib/graphql-dev/queries/attachments";

function toOptimisticContent(contents: Array<string | File>): unknown[] {
  return contents.map((content) => {
    if (typeof content === "string") {
      return { $type: "org.hypercerts.defs#uri", uri: content };
    }

    return {
      $type: "org.hypercerts.defs#smallBlob",
      blob: {
        uri: URL.createObjectURL(content),
        cid: null,
        mimeType: content.type || "application/octet-stream",
        size: content.size,
        name: content.name,
      },
    };
  });
}

export function buildOptimisticAttachmentItem(args: {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  title: string;
  contentType: string;
  description?: BumicertsLeafletEditorProps["content"];
  subjectInfo: {
    uri: string;
    cid: string;
  };
  contents: Array<string | File>;
}): AttachmentItem {
  const createdAt = new Date().toISOString();

  return {
    metadata: {
      did: args.did,
      uri: args.uri,
      rkey: args.rkey,
      cid: args.cid,
      createdAt,
      indexedAt: createdAt,
    },
    creatorInfo: {
      did: args.did,
      organizationName: null,
      organizationLogo: null,
    },
    record: {
      title: args.title,
      shortDescription: null,
      description: args.description,
      contentType: args.contentType,
      subjects: [args.subjectInfo],
      content: toOptimisticContent(args.contents),
      createdAt,
    },
  };
}
