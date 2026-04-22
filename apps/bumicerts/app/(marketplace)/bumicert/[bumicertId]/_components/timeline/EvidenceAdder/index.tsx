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
import AudioViewer from "./AudioViewer";
import TreeViewer from "./TreeViewer";
import { ListSkeleton } from "./shared/RecordList";
import SiteViewer from "./SiteViewer";
import ManageOption from "./shared/ManageOption";
import Mutator from "./shared/Mutator";

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

const LoadingWrapper = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => {
  if (isLoading) return <ListSkeleton />;
  return children;
};

const EMPTY_DOC: LeafletLinearDocument = { blocks: [] };

interface EvidenceLinkerProps {
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  organizationDid: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export type SubjectInfo = {
  activityUri: string;
  activityCid: string;
};
export function EvidenceLinker({
  activityUri,
  activityCid,
  organizationDid,
}: EvidenceLinkerProps) {
  const [activeTab, setActiveTab] = useState<TabId>();
  const [description, setDescription] =
    useState<LeafletLinearDocument>(EMPTY_DOC);

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

  // ── Selection ──────────────────────────────────────────────────────────────

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
      <div className="mt-4 flex flex-col gap-2">
        {activeTab === "audio" ? (
          <LoadingWrapper isLoading={audioLoading}>
            <AudioViewer
              data={audioItems}
              description={description}
              setDescription={setDescription}
              activityCid={activityCid}
              activityUri={activityUri}
            />
          </LoadingWrapper>
        ) : activeTab === "trees" ? (
          <LoadingWrapper isLoading={occurrenceLoading}>
            <TreeViewer
              data={occurrenceItems}
              description={description}
              setDescription={setDescription}
              activityCid={activityCid}
              activityUri={activityUri}
            />
          </LoadingWrapper>
        ) : activeTab === "sites" ? (
          <LoadingWrapper isLoading={locationLoading}>
            <SiteViewer
              data={locationItems}
              description={description}
              setDescription={setDescription}
              activityCid={activityCid}
              activityUri={activityUri}
            />
          </LoadingWrapper>
        ) : (
          <div className="w-full">
            <span className="bg-muted text-destructive text-sm rounded-xl flex items-center justify-center text-center w-full px-2 py-1">
              Coming soon
            </span>
            <FileInput className="mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}
