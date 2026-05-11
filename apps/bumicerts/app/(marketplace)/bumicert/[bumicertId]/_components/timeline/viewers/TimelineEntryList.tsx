import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { TimelineEntry } from "./TimelineEntry";

interface TimelineEntryListProps {
  entries: AttachmentItem[];
}

export function TimelineEntryList({ entries }: TimelineEntryListProps) {
  return (
    <div className="relative flex flex-col gap-3 pl-7 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-px before:bg-border">
      {entries.map((item, index) => (
        <div key={item.metadata?.uri ?? index} className="relative">
          <span className="absolute -left-[1.625rem] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <TimelineEntry item={item} index={index} />
        </div>
      ))}
    </div>
  );
}
