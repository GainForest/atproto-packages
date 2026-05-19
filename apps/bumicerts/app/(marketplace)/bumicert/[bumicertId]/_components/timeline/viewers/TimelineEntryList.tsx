import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import type { ResolvedAttachmentReference } from "./shared/referenceResolution/referenceViewModel";
import type { TimelineMapLayer } from "./shared/timelineMapLayers";
import { TimelineEntry } from "./TimelineEntry";

export interface TimelineEntryListItem {
  item: AttachmentItem;
  index: number;
  entryId: string;
  references: ResolvedAttachmentReference[];
  mapLayers: TimelineMapLayer[];
}

interface TimelineEntryListProps {
  entries: TimelineEntryListItem[];
  referencesLoading: boolean;
}

export function TimelineEntryList({
  entries,
  referencesLoading,
}: TimelineEntryListProps) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <TimelineEntry
          key={entry.entryId}
          item={entry.item}
          index={entry.index}
          entryId={entry.entryId}
          references={entry.references}
          referencesLoading={referencesLoading}
          mapLayers={entry.mapLayers}
        />
      ))}
    </div>
  );
}
