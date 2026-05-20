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
import { TimelineEntryList, type TimelineEntryListItem } from "./TimelineEntryList";
import { TimelineEmpty } from "./shared/TimelineEmpty";
import { TimelineGreenGlobePreview } from "./shared/TimelineGreenGlobePreview";
import { TimelineSkeleton } from "./shared/TimelineSkeleton";
import {
  buildTimelineMapLayers,
  type TimelineMapLayer,
} from "./shared/timelineMapLayers";
import { TimelineViewerStoreProvider } from "./shared/timelineViewerStore";
import { useResolvedAttachmentReferenceMap } from "./shared/referenceResolution/useResolvedAttachmentReferences";
import { useLocale, useTranslations } from "next-intl";

interface TimelinePanelProps {
  entries: AttachmentItem[];
  isLoading: boolean;
  isOwner: boolean;
  organizationDid: string;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthYear(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

function formatLinkedWindow(entries: AttachmentItem[], locale: string): string | null {
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
    return formatMonthYear(first, locale);
  }

  return `${formatMonthYear(first, locale)} – ${formatMonthYear(last, locale)}`;
}

function getTimelineEntryId(item: AttachmentItem, index: number): string {
  return item.metadata?.uri ?? `${item.metadata?.rkey ?? "entry"}-${index}`;
}

export function TimelinePanel({
  entries,
  isLoading,
  isOwner,
  organizationDid,
}: TimelinePanelProps) {
  const t = useTranslations("bumicert.detail.timeline");
  const locale = useLocale();
  const [activeFilter, setActiveFilter] = useState<TimelineEvidenceFilter>("all");
  const linkedWindow = useMemo(
    () => formatLinkedWindow(entries, locale),
    [entries, locale],
  );
  const referenceRequests = useMemo(
    () =>
      entries.map((entry, index) => ({
        key: getTimelineEntryId(entry, index),
        content: entry.record?.content,
      })),
    [entries],
  );
  const { referencesByKey, isLoading: referencesLoading } =
    useResolvedAttachmentReferenceMap(referenceRequests);
  const entryViewModels = useMemo<TimelineEntryListItem[]>(
    () =>
      entries.map((entry, index) => {
        const entryId = getTimelineEntryId(entry, index);
        const references = referencesByKey.get(entryId) ?? [];

        return {
          item: entry,
          index,
          entryId,
          references,
          mapLayers: buildTimelineMapLayers([{ item: entry, references }]),
        };
      }),
    [entries, referencesByKey],
  );
  const mapLayers = useMemo<TimelineMapLayer[]>(() => {
    const seenDatasetUris = new Set<string>();
    const layers: TimelineMapLayer[] = [];

    for (const entry of entryViewModels) {
      for (const layer of entry.mapLayers) {
        if (seenDatasetUris.has(layer.datasetUri)) {
          continue;
        }

        seenDatasetUris.add(layer.datasetUri);
        layers.push(layer);
      }
    }

    return layers;
  }, [entryViewModels]);
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
      entryViewModels.filter((entry) =>
        matchesTimelineFilter(
          getTimelineEvidenceKind(
            entry.item.record?.contentType,
            entry.item.record?.content,
          ),
          activeFilter,
        ),
      ),
    [activeFilter, entryViewModels],
  );

  return (
    <TimelineViewerStoreProvider isOwner={isOwner}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl tracking-tight text-foreground">
                {t("title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("itemCount", { count: entries.length })}
                {linkedWindow ? ` · ${t("linked", { window: linkedWindow })}` : ""}
              </p>
            </div>
            {linkedWindow ? (
              <p className="text-xs text-muted-foreground">
                {t("linkedWindow", { window: linkedWindow })}
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
                  {t(`filters.${filter.id}`)}
                  {filter.id !== "all" && count > 0 ? ` ${count}` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {!isLoading ? (
          <TimelineGreenGlobePreview
            organizationDid={organizationDid}
            layers={mapLayers}
            isLoading={referencesLoading}
          />
        ) : null}

        {isLoading ? (
          <TimelineSkeleton />
        ) : entries.length === 0 ? (
          <TimelineEmpty />
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            {t("emptyFiltered")}
          </div>
        ) : (
          <TimelineEntryList
            entries={filteredEntries}
            referencesLoading={referencesLoading}
          />
        )}
      </div>
    </TimelineViewerStoreProvider>
  );
}
