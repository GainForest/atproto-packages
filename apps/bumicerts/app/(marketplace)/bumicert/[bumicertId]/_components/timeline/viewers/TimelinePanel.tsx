"use client";

import { useMemo, useState } from "react";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { cn } from "@/lib/utils";
import {
  getTimelineEvidenceKind,
  matchesTimelineFilter,
  TIMELINE_EVIDENCE_FILTERS,
  type TimelineEvidenceFilter,
} from "../shared/evidenceKind";
import { TimelineEntryList } from "./TimelineEntryList";
import { TimelineEmpty } from "./shared/TimelineEmpty";
import { TimelineSkeleton } from "./shared/TimelineSkeleton";
import { TimelineViewerStoreProvider } from "./shared/timelineViewerStore";

interface TimelinePanelProps {
  entries: AttachmentItem[];
  isLoading: boolean;
  isOwner: boolean;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatLinkedWindow(entries: AttachmentItem[]): string | null {
  const dates = entries
    .map((entry) => parseDate(entry.record?.createdAt ?? entry.metadata?.createdAt))
    .filter((date): date is Date => date !== null);

  if (dates.length === 0) {
    return null;
  }

  const first = dates.reduce((current, next) =>
    next.getTime() < current.getTime() ? next : current,
  );
  const last = dates.reduce((current, next) =>
    next.getTime() > current.getTime() ? next : current,
  );

  if (
    first.getUTCFullYear() === last.getUTCFullYear() &&
    first.getUTCMonth() === last.getUTCMonth()
  ) {
    return formatMonthYear(first);
  }

  return `${formatMonthYear(first)} – ${formatMonthYear(last)}`;
}

export function TimelinePanel({ entries, isLoading, isOwner }: TimelinePanelProps) {
  const [activeFilter, setActiveFilter] = useState<TimelineEvidenceFilter>("all");
  const linkedWindow = useMemo(() => formatLinkedWindow(entries), [entries]);
  const entriesByFilter = useMemo(() => {
    const counts: Array<[TimelineEvidenceFilter, number]> =
      TIMELINE_EVIDENCE_FILTERS.map((filter) => [
        filter.id,
        entries.filter((entry) =>
          matchesTimelineFilter(
            getTimelineEvidenceKind(entry.record?.contentType, entry.record?.content),
            filter.id,
          ),
        ).length,
      ]);
    return new Map(counts);
  }, [entries]);
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesTimelineFilter(
          getTimelineEvidenceKind(entry.record?.contentType, entry.record?.content),
          activeFilter,
        ),
      ),
    [activeFilter, entries],
  );

  return (
    <TimelineViewerStoreProvider isOwner={isOwner}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl tracking-tight text-foreground">
                Evidence Timeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {entries.length} item{entries.length === 1 ? "" : "s"}
                {linkedWindow ? ` · linked ${linkedWindow}` : ""}
              </p>
            </div>
            {linkedWindow ? (
              <p className="text-xs text-muted-foreground">
                Linked window: {linkedWindow}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TIMELINE_EVIDENCE_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = entriesByFilter.get(filter.id) ?? 0;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {filter.label}
                  {filter.id !== "all" && count > 0 ? ` ${count}` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <TimelineSkeleton />
        ) : entries.length === 0 ? (
          <TimelineEmpty />
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            No evidence matches this filter.
          </div>
        ) : (
          <TimelineEntryList entries={filteredEntries} />
        )}
      </div>
    </TimelineViewerStoreProvider>
  );
}
