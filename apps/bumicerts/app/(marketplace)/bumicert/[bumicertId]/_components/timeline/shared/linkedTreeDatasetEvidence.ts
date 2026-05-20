import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { getLinkedTreeDatasetUrisFromContent } from "./attachmentContentParser";
import { isAttachmentForActivity } from "./attachmentSubjects";

export function getEntriesForActivity(
  data: readonly AttachmentItem[] | undefined,
  activityUri: string,
): AttachmentItem[] {
  const items = data ?? [];
  return items.filter((item) => isAttachmentForActivity(item, activityUri));
}

export function getLinkedTreeDatasetUris(
  entries: readonly AttachmentItem[],
): Set<string> {
  const linkedUris = new Set<string>();

  for (const entry of entries) {
    for (const uri of getLinkedTreeDatasetUrisFromContent(entry.record?.content)) {
      linkedUris.add(uri);
    }
  }

  return linkedUris;
}

export function getLinkedTreeDatasetUrisForActivity(
  data: readonly AttachmentItem[] | undefined,
  activityUri: string,
): Set<string> {
  return getLinkedTreeDatasetUris(getEntriesForActivity(data, activityUri));
}
