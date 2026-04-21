"use client";

/**
 * EvidenceLinker — inline sticky panel (owner only) that lets an org
 * link existing records (audio, tree occurrences, sites) as evidence on
 * a bumicert by creating org.hypercerts.context.attachment records.
 *
 * Lives in the right column of the full-width timeline tab. No modal involved.
 */

import { useState } from "react";
import {
  MicIcon,
  TreesIcon,
  MapPinIcon,
  ExternalLinkIcon,
  LinkIcon,
  FileIcon,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { useAtprotoStore } from "@/components/stores/atproto";
import type { AudioRecordingItem } from "@/lib/graphql-dev/queries/audio";
import type { OccurrenceItem } from "@/lib/graphql-dev/queries/occurrences";
import type { CertifiedLocation } from "@/lib/graphql-dev/queries/locations";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { links } from "@/lib/links";
import Link from "next/link";
import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import FileInput from "@/components/ui/FileInput";

// ── Tab types ─────────────────────────────────────────────────────────────────

type TabId = "audio" | "trees" | "sites" | "files";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  manageHref?: string;
}[] = [
  {
    id: "audio",
    label: "Audio",
    icon: MicIcon,
    manageHref: links.manage.audio,
  },
  {
    id: "trees",
    label: "Trees",
    icon: TreesIcon,
    manageHref: links.manage.trees,
  },
  {
    id: "sites",
    label: "Sites",
    icon: MapPinIcon,
    manageHref: links.manage.sites,
  },
  {
    id: "files",
    label: "Files",
    icon: FileIcon,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const EMPTY_DOC: LeafletLinearDocument = { blocks: [] };

// ── Checkbox row ──────────────────────────────────────────────────────────────

function CheckRow({
  selected,
  onToggle,
  primary,
  secondary,
  icon: Icon,
}: {
  selected: boolean;
  onToggle: () => void;
  primary: string;
  secondary?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      {/* Custom checkbox */}
      <div
        className={`h-4 w-4 rounded-sm border-2 shrink-0 flex items-center justify-center transition-colors ${
          selected ? "bg-primary border-primary" : "border-muted-foreground/40"
        }`}
      >
        {selected && (
          <div className="h-2 w-2 rounded-[2px] bg-primary-foreground" />
        )}
      </div>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {primary}
        </p>
        {secondary && (
          <p className="text-xs text-muted-foreground truncate">{secondary}</p>
        )}
      </div>
    </button>
  );
}

// ── List skeleton ─────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function ListEmpty({ tab, manageHref }: { tab: TabId; manageHref: string }) {
  const label =
    tab === "audio"
      ? "audio recordings"
      : tab === "trees"
        ? "tree occurrences"
        : "sites";
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-xs text-muted-foreground">No {label} uploaded yet.</p>
      <Link
        href={manageHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        Upload {label}
        <ExternalLinkIcon className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EvidenceLinkerProps {
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  organizationDid: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function EvidenceLinker({
  activityUri,
  activityCid,
  organizationDid,
}: EvidenceLinkerProps) {
  const auth = useAtprotoStore((state) => state.auth);
  const indexerUtils = indexerTrpc.useUtils();

  const [activeTab, setActiveTab] = useState<TabId>();
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const [description, setDescription] =
    useState<LeafletLinearDocument>(EMPTY_DOC);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: audioData, isLoading: audioLoading } =
    indexerTrpc.audio.list.useQuery({ did: organizationDid });
  const { data: occurrenceData, isLoading: occurrenceLoading } =
    indexerTrpc.dwc.occurrences.useQuery({ did: organizationDid });
  const { data: locationData, isLoading: locationLoading } =
    indexerTrpc.locations.list.useQuery({ did: organizationDid });

  const audioItems: AudioRecordingItem[] = audioData ?? [];
  const occurrenceItems: OccurrenceItem[] = occurrenceData ?? [];
  const locationItems: CertifiedLocation[] = locationData ?? [];

  const activeManageHref =
    TABS.find((t) => t.id === activeTab)?.manageHref ?? "";
  const isLoading =
    activeTab === "audio"
      ? audioLoading
      : activeTab === "trees"
        ? occurrenceLoading
        : locationLoading;

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggle = (uri: string) => {
    setSuccessCount(null);
    setError(null);
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  const selectedCount = selectedUris.size;

  // ── Mutation ───────────────────────────────────────────────────────────────

  const createAttachment = trpc.context.attachment.create.useMutation();

  const audioUriSet = new Set(
    audioItems.map((a) => a.metadata?.uri).filter(Boolean) as string[],
  );
  const occurrenceUriSet = new Set(
    occurrenceItems.map((o) => o.metadata?.uri).filter(Boolean) as string[],
  );

  const handleLink = async () => {
    if (selectedCount === 0) return;
    setError(null);
    setIsSubmitting(true);
    const hasDescription = description.blocks.length > 0;

    try {
      for (const uri of selectedUris) {
        let title: string;
        let contentType: string;

        if (audioUriSet.has(uri)) {
          const item = audioItems.find((a) => a.metadata?.uri === uri);
          title = `Audio: ${item?.record?.name ?? "Recording"}`;
          contentType = "audio";
        } else if (occurrenceUriSet.has(uri)) {
          const item = occurrenceItems.find((o) => o.metadata?.uri === uri);
          const species =
            item?.record?.scientificName ??
            item?.record?.vernacularName ??
            "Occurrence";
          title = `Tree: ${species}`;
          contentType = "occurrence";
        } else {
          const item = locationItems.find((l) => l.metadata?.uri === uri);
          title = `Site: ${item?.record?.name ?? "Location"}`;
          contentType = "location";
        }

        await createAttachment.mutateAsync({
          title,
          contentType,
          subjects: [
            {
              $type: "com.atproto.repo.strongRef",
              uri: activityUri,
              cid: activityCid,
            },
          ],
          content: [{ $type: "org.hypercerts.defs#uri", uri }],
          ...(hasDescription ? { description } : {}),
        });
      }

      await indexerUtils.context.attachments.invalidate();
      setSuccessCount(selectedCount);
      setSelectedUris(new Set());
      setDescription(EMPTY_DOC);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (activeTab === undefined)
    return (
      <div className="flex flex-col">
        <span className="text-muted-foreground italic font-instrument text-2xl font-medium">
          Add Evidence
        </span>
        <span className="text-sm text-muted-foreground">
          Select the type of evidence to add.
        </span>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {TABS.map(({ id, label, icon: Icon }) => {
            return (
              <Button
                key={id}
                variant={"secondary"}
                onClick={() => setActiveTab(id)}
                className="h-auto hover:bg-accent hover:text-primary rounded-2xl shadow-none flex flex-col items-start justify-between"
              >
                <Icon className="size-6 opacity-40" />
                <span className="text-xl">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col">
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <Button
          variant={"secondary"}
          size={"icon-sm"}
          className="shadow-none"
          onClick={() => {
            setActiveTab(undefined);
          }}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col">
          <span className="text-muted-foreground italic font-instrument text-2xl font-medium">
            Add {TABS.find((tab) => tab.id === activeTab)?.label}
          </span>
          <span className="text-sm text-muted-foreground">
            Select the evidence to add.
          </span>
        </div>
      </div>
      {/* Record list */}
      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-0.5">
        {isLoading ? (
          <ListSkeleton />
        ) : activeTab === "audio" ? (
          audioItems.length === 0 ? (
            <ListEmpty tab="audio" manageHref={activeManageHref} />
          ) : (
            audioItems.map((item) => {
              const uri = item.metadata?.uri;
              if (!uri) return null;
              return (
                <CheckRow
                  key={uri}
                  selected={selectedUris.has(uri)}
                  onToggle={() => toggle(uri)}
                  icon={MicIcon}
                  primary={item.record?.name ?? "Untitled recording"}
                  secondary={formatDate(
                    ((
                      item.record?.metadata as
                        | Record<string, unknown>
                        | null
                        | undefined
                    )?.["recordedAt"] as string) ??
                      item.record?.createdAt ??
                      undefined,
                  )}
                />
              );
            })
          )
        ) : activeTab === "trees" ? (
          occurrenceItems.length === 0 ? (
            <ListEmpty tab="trees" manageHref={activeManageHref} />
          ) : (
            occurrenceItems.map((item) => {
              const uri = item.metadata?.uri;
              if (!uri) return null;
              const species =
                item.record?.scientificName ??
                item.record?.vernacularName ??
                "Unknown species";
              const count = item.record?.individualCount;
              const date = formatDate(
                item.record?.eventDate ?? item.record?.createdAt ?? undefined,
              );
              const secondary = [
                count != null
                  ? `${count} individual${count !== 1 ? "s" : ""}`
                  : null,
                date,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <CheckRow
                  key={uri}
                  selected={selectedUris.has(uri)}
                  onToggle={() => toggle(uri)}
                  icon={TreesIcon}
                  primary={species}
                  secondary={secondary || undefined}
                />
              );
            })
          )
        ) : activeTab === "sites" ? (
          locationItems.length === 0 ? (
            <ListEmpty tab="sites" manageHref={activeManageHref} />
          ) : (
            locationItems.map((item) => {
              const uri = item.metadata?.uri;
              if (!uri) return null;
              return (
                <CheckRow
                  key={uri}
                  selected={selectedUris.has(uri)}
                  onToggle={() => toggle(uri)}
                  icon={MapPinIcon}
                  primary={item.record?.name ?? "Unnamed site"}
                  secondary={item.record?.locationType ?? undefined}
                />
              );
            })
          )
        ) : (
          <div className="mt-4 w-full">
            <span className="bg-muted text-destructive text-sm rounded-xl flex items-center justify-center text-center w-full px-2 py-1">
              Coming soon
            </span>
            <FileInput className="mt-1" />
          </div>
        )}
      </div>

      {/* Manage link */}
      {activeManageHref.length !== 0 && (
        <div className="flex justify-end -mt-2">
          <Link
            href={activeManageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Manage
            <ExternalLinkIcon className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Optional note */}
      <div className="mt-2 flex flex-col w-full">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-[0.1em]">
          Optional Note
        </p>
        <LeafletEditor
          content={description}
          onChange={setDescription}
          ownerDid={auth.user?.did ?? organizationDid}
          placeholder="Add context about this evidence…"
          className="text-sm min-h-18!"
        />
      </div>

      {/* Error / success feedback */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {successCount !== null && (
        <p className="text-sm text-primary">
          Linked {successCount} record{successCount !== 1 ? "s" : ""}{" "}
          successfully.
        </p>
      )}

      {/* Submit */}
      <Button
        onClick={handleLink}
        disabled={selectedCount === 0 || isSubmitting}
        className="w-full"
      >
        <LinkIcon />
        {isSubmitting
          ? "Linking…"
          : selectedCount === 0
            ? "Select records to link"
            : `Link ${selectedCount} record${selectedCount !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
