import type { AttachmentItem } from "@/lib/graphql-dev/queries/attachments";
import { TimelineEntryList } from "./TimelineEntryList";
import { TimelineEmpty } from "./shared/TimelineEmpty";
import { TimelineSkeleton } from "./shared/TimelineSkeleton";

interface TimelinePanelProps {
  entries: AttachmentItem[];
  isLoading: boolean;
  isOwner: boolean;
}

export function TimelinePanel({ entries, isLoading, isOwner }: TimelinePanelProps) {
  return (
    <div className="space-y-1">
      {isLoading ? (
        <TimelineSkeleton />
      ) : entries.length === 0 ? (
        <TimelineEmpty />
      ) : (
        <TimelineEntryList entries={entries} isOwner={isOwner} />
      )}
    </div>
  );
}
