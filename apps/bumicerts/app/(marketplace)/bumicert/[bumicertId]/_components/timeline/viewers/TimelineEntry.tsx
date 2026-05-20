import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon, ExternalLinkIcon, Trash2Icon } from "lucide-react";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { formatError } from "@/lib/utils/trpc-errors";
import { buildTimelineFeedTiles } from "../shared/timelineFeedViewModel";
import {
  getTimelineEvidenceKind,
  getTimelineEvidenceKindLabel,
  type TimelineEvidenceKind,
} from "../shared/evidenceKind";
import { formatEvidenceDateRangeFromValues } from "../shared/datasetStats";
import type { ResolvedAttachmentReference } from "./shared/referenceResolution/referenceViewModel";
import { TimelineDeleteConfirm } from "./shared/TimelineDeleteConfirm";
import {
  TimelineOptionalNote,
  hasTimelineOptionalNote,
} from "./shared/TimelineOptionalNote";
import { TimelineDatasetMapLayerCards } from "./shared/TimelineDatasetMapLayerCards";
import { TimelinePreviewPanel } from "./shared/TimelinePreviewPanel";
import { TimelineTileRow } from "./shared/TimelineTileRow";
import { useTimelineViewerStore } from "./shared/timelineViewerStore";
import type { TimelineMapLayer } from "./shared/timelineMapLayers";

interface TimelineEntryProps {
  item: AttachmentItem;
  index: number;
  entryId: string;
  references: ResolvedAttachmentReference[];
  referencesLoading: boolean;
  mapLayers: TimelineMapLayer[];
}

function formatPublicDate(value: string | null | undefined): string {
  const formatted = formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return formatted.length > 0 ? formatted : "Not specified";
}

function getExplicitTitle(item: AttachmentItem): string | null {
  const title = item.record?.title?.trim();
  return title && title.length > 0 ? title : null;
}

function getEntryTitle(
  item: AttachmentItem,
  kind: TimelineEvidenceKind,
  references: ResolvedAttachmentReference[],
): string {
  const explicitTitle = getExplicitTitle(item);
  const firstDataset = references.find((reference) => reference.kind === "dataset");

  if (kind === "tree" && firstDataset) {
    return firstDataset.title;
  }

  if (kind === "biodiversity") {
    return explicitTitle ?? "Biodiversity observations";
  }

  return explicitTitle ?? getTimelineEvidenceKindLabel(kind);
}

function getRecordedDateLabel(
  kind: TimelineEvidenceKind,
  references: ResolvedAttachmentReference[],
): string {
  const datasetReferences = references.filter((reference) => reference.kind === "dataset");
  if (datasetReferences.length > 0) {
    const datasetRange = datasetReferences
      .map((reference) => reference.recordedDateRange)
      .find((value) => typeof value === "string" && value.length > 0);
    if (datasetRange) {
      return datasetRange;
    }
  }

  const occurrenceDates = references
    .filter((reference) => reference.kind === "occurrence")
    .map((reference) => reference.recordedAt);
  const occurrenceRange = formatEvidenceDateRangeFromValues(occurrenceDates);
  if (occurrenceRange) {
    return occurrenceRange;
  }

  if (kind === "audio") {
    const audioDate = references.find((reference) => reference.kind === "audio")?.recordedAt;
    return formatPublicDate(audioDate);
  }

  return "Not specified";
}

function getMetricBadges(
  kind: TimelineEvidenceKind,
  references: ResolvedAttachmentReference[],
  tileCount: number,
): string[] {
  if (kind === "tree") {
    const datasetMetrics = references
      .filter((reference) => reference.kind === "dataset")
      .map((reference) => reference.metrics);
    const treeCount = datasetMetrics.reduce(
      (total, metrics) => total + (metrics?.treeCount ?? metrics?.recordCount ?? 0),
      0,
    );
    const speciesCount = datasetMetrics.reduce(
      (total, metrics) => total + (metrics?.speciesCount ?? 0),
      0,
    );
    const occurrenceReferences = references.filter((reference) => reference.kind === "occurrence");
    const fallbackSpecies = new Set(
      occurrenceReferences
        .map((reference) => reference.title.trim().toLowerCase())
        .filter((value) => value.length > 0),
    );
    const resolvedTreeCount = treeCount > 0 ? treeCount : occurrenceReferences.length;
    const resolvedSpeciesCount = speciesCount > 0 ? speciesCount : fallbackSpecies.size;

    return [
      resolvedTreeCount > 0 ? `${resolvedTreeCount} tree${resolvedTreeCount === 1 ? "" : "s"}` : null,
      resolvedSpeciesCount > 0 ? `${resolvedSpeciesCount} species` : null,
    ].filter((value): value is string => typeof value === "string");
  }

  if (kind === "biodiversity") {
    const occurrenceReferences = references.filter((reference) => reference.kind === "occurrence");
    const species = new Set(
      occurrenceReferences
        .map((reference) => reference.title.trim().toLowerCase())
        .filter((value) => value.length > 0),
    );

    return [
      `${occurrenceReferences.length} observation${occurrenceReferences.length === 1 ? "" : "s"}`,
      species.size > 0 ? `${species.size} species` : null,
    ].filter((value): value is string => typeof value === "string");
  }

  if (kind === "audio") {
    return [`${tileCount} recording${tileCount === 1 ? "" : "s"}`];
  }

  if (kind === "document") {
    return [`${tileCount} item${tileCount === 1 ? "" : "s"}`];
  }

  return [];
}

function getGreenGlobeHref(references: ResolvedAttachmentReference[]): string | null {
  return references.find((reference) => reference.greenGlobeHref)?.greenGlobeHref ?? null;
}

export function TimelineEntry({
  item,
  index,
  entryId,
  references,
  referencesLoading,
  mapLayers,
}: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const panelId = useId();
  const deleteConfirmId = useId();
  const isOwner = useTimelineViewerStore((state) => state.isOwner);
  const tiles = useMemo(
    () =>
      buildTimelineFeedTiles({
        entryId,
        content: item.record?.content,
        references,
      }),
    [entryId, item.record?.content, references],
  );

  const evidenceKind = getTimelineEvidenceKind(item.record?.contentType, item.record?.content);
  const contentLabel = getTimelineEvidenceKindLabel(evidenceKind);
  const tileCount = tiles.length;
  const entryTitle = getEntryTitle(item, evidenceKind, references);
  const metricBadges = referencesLoading
    ? []
    : getMetricBadges(evidenceKind, references, tileCount);
  const recordedDateLabel = referencesLoading
    ? "Resolving evidence date…"
    : getRecordedDateLabel(evidenceKind, references);
  const linkedDateLabel = formatPublicDate(item.record?.createdAt ?? item.metadata?.createdAt);
  const greenGlobeHref = getGreenGlobeHref(references);
  const previewTiles = useMemo(
    () =>
      tiles.filter((tile) => {
        if (!tile.preview) {
          return false;
        }

        if (tile.preview.kind === "green-globe") {
          return false;
        }

        if (evidenceKind === "biodiversity" && tile.preview.kind === "text") {
          return false;
        }

        return true;
      }),
    [evidenceKind, tiles],
  );
  const selectedTileId = useTimelineViewerStore(
    (state) => state.selectedPreviewTileByEntryId[entryId] ?? null,
  );
  const setSelectedPreviewTile = useTimelineViewerStore(
    (state) => state.setSelectedPreviewTile,
  );
  const activeTileId =
    selectedTileId && previewTiles.some((tile) => tile.id === selectedTileId)
      ? selectedTileId
      : (previewTiles[0]?.id ?? null);
  const activeInlinePreview = previewTiles.find((tile) => tile.id === activeTileId)?.preview ?? null;
  const shouldShowThumbnailRow = previewTiles.length > 1;
  const hasNote = hasTimelineOptionalNote(item.record?.description, item.metadata?.did);
  const observationReferences = references.filter((reference) => reference.kind === "occurrence");

  const indexerUtils = indexerTrpc.useUtils();
  const deleteAttachment = trpc.context.attachment.delete.useMutation();
  const rkey = item.metadata?.rkey;
  const authorDid = item.metadata?.did;

  async function handleDelete() {
    if (!rkey) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteAttachment.mutateAsync({ rkey });

      if (authorDid) {
        indexerUtils.context.attachments.setData({ did: authorDid }, (previous) =>
          (previous ?? []).filter((entry) => entry.metadata?.rkey !== rkey),
        );
      }

      setShowDeleteConfirm(false);

      try {
        if (authorDid) {
          await indexerUtils.context.attachments.invalidate({ did: authorDid });
        } else {
          await indexerUtils.context.attachments.invalidate();
        }
      } catch {}
    } catch (error) {
      setDeleteError(formatError(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.article
      className="rounded-2xl border border-border/60 bg-background shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-primary">
              {contentLabel}
            </span>
            {metricBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {badge}
              </span>
            ))}
          </div>
          <h3 className="mt-1 text-base text-foreground">
            {entryTitle}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{recordedDateLabel}</span>
            <span>linked {linkedDateLabel}</span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {greenGlobeHref ? (
            <a
              href={greenGlobeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Open in Green Globe"
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          ) : null}
        {isOwner && rkey && (
          <button
            type="button"
            aria-expanded={showDeleteConfirm}
            aria-controls={deleteConfirmId}
            onClick={() => {
              setShowDeleteConfirm((v) => !v);
              setDeleteError(null);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove evidence"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        )}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? "Collapse evidence" : "Expand evidence"}
          >
            <ChevronDownIcon
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className="space-y-3 border-t border-border/50 p-4 pt-3">
          {referencesLoading ? (
            <p className="text-xs text-muted-foreground">
              Resolving linked evidence records…
            </p>
          ) : null}

          {hasNote ? (
            <div className="rounded-xl bg-muted/20 px-3 py-2">
              <TimelineOptionalNote
                note={item.record?.description}
                ownerDid={item.metadata?.did}
              />
            </div>
          ) : null}

          {evidenceKind === "biodiversity" && observationReferences.length > 0 ? (
            <div className="rounded-xl bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Selected observations
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {observationReferences.slice(0, 8).map((reference) => (
                  <span
                    key={reference.id}
                    className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground shadow-xs"
                  >
                    {reference.title}
                  </span>
                ))}
                {observationReferences.length > 8 ? (
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-xs">
                    +{observationReferences.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <TimelineDatasetMapLayerCards layers={mapLayers} />

          <TimelinePreviewPanel preview={activeInlinePreview} />

          {shouldShowThumbnailRow ? (
            <TimelineTileRow
              tiles={previewTiles}
              activeTileId={activeTileId}
              onTileClick={(tile) => {
                setSelectedPreviewTile(entryId, tile.id);
              }}
            />
          ) : null}

          {greenGlobeHref && !activeInlinePreview ? (
            <a
              href={greenGlobeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
            >
              View on Green Globe
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : null}

      {showDeleteConfirm && rkey && (
        <TimelineDeleteConfirm
          id={deleteConfirmId}
          title={item.record?.title ?? "Evidence item"}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}
    </motion.article>
  );
}
