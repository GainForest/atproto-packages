"use client";

/**
 * EvidenceAdder — inline sticky panel (owner only) that lets an org
 * link existing records (audio, tree datasets, biodiversity, files) as evidence on
 * a bumicert by creating org.hypercerts.context.attachment records.
 *
 * Lives in the right column of the full-width timeline tab. No modal involved.
 */

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type {
  AudioRecordingItem,
  CertifiedLocation,
  DatasetItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import AudioEvidencePicker from "./AudioEvidencePicker";
import DatasetEvidencePicker from "./DatasetEvidencePicker";
import BiodiversityEvidencePicker from "./BiodiversityEvidencePicker";
import FileEvidencePicker from "./FileEvidencePicker";
import { ListSkeleton } from "./shared/RecordList";
import { EVIDENCE_TABS } from "./shared/evidenceRegistry";
import {
  EvidenceAdderStoreProvider,
  useEvidenceAdderStore,
} from "./shared/evidenceAdderStore";

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

interface EvidenceAdderProps {
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  organizationDid: string;
  linkedTreeDatasetUris: ReadonlySet<string>;
  timelineAttachmentsLoading: boolean;
  timelineAttachmentsUnavailable: boolean;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function EvidenceAdder({
  activityUri,
  organizationDid,
  activityCid,
  linkedTreeDatasetUris,
  timelineAttachmentsLoading,
  timelineAttachmentsUnavailable,
}: EvidenceAdderProps) {
  return (
    <EvidenceAdderStoreProvider
      organizationDid={organizationDid}
      activityUri={activityUri}
      activityCid={activityCid}
    >
      <EvidenceAdderContent
        organizationDid={organizationDid}
        linkedTreeDatasetUris={linkedTreeDatasetUris}
        timelineAttachmentsLoading={timelineAttachmentsLoading}
        timelineAttachmentsUnavailable={timelineAttachmentsUnavailable}
      />
    </EvidenceAdderStoreProvider>
  );
}

function EvidenceAdderContent({
  organizationDid,
  linkedTreeDatasetUris,
  timelineAttachmentsLoading,
  timelineAttachmentsUnavailable,
}: {
  organizationDid: string;
  linkedTreeDatasetUris: ReadonlySet<string>;
  timelineAttachmentsLoading: boolean;
  timelineAttachmentsUnavailable: boolean;
}) {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const activeTab = useEvidenceAdderStore((state) => state.activeTab);
  const setActiveTab = useEvidenceAdderStore((state) => state.setActiveTab);
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: audioData, isLoading: audioLoading } =
    indexerTrpc.audio.list.useQuery({ did: organizationDid });
  const { data: occurrenceData, isLoading: occurrenceLoading } =
    indexerTrpc.dwc.occurrences.useQuery({ did: organizationDid });
  const { data: datasetData, isLoading: datasetLoading } =
    indexerTrpc.datasets.list.useQuery({ did: organizationDid });
  const { data: locationData, isLoading: locationLoading } =
    indexerTrpc.locations.list.useQuery({ did: organizationDid });

  const audioItems: AudioRecordingItem[] = audioData ?? [];
  const occurrenceItems: OccurrenceItem[] = occurrenceData ?? [];
  const datasetItems: DatasetItem[] = datasetData ?? [];
  const locationItems: CertifiedLocation[] = locationData ?? [];

  // ── Selection ──────────────────────────────────────────────────────────────

  if (activeTab === undefined)
    return (
      <div className="flex flex-col">
        <span className="font-instrument text-2xl font-medium text-foreground">
          {t("chooseEvidenceType")}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("selectSourceToLink")}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 mt-4">
          {EVIDENCE_TABS.map(({ id, icon: Icon }) => {
            return (
              <Button
                key={id}
                variant={"secondary"}
                onClick={() => setActiveTab(id)}
                className="h-auto hover:bg-accent hover:text-primary rounded-2xl shadow-none flex flex-col items-start justify-between"
              >
                <Icon className="opacity-40" />
                <span className="text-xl">{t(`tabs.${id}`)}</span>
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
          disabled={isSubmitting}
          onClick={() => {
            setActiveTab(undefined);
          }}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-col">
          <span className="font-instrument text-2xl font-medium text-foreground">
            {t("linkType", { type: t(`tabs.${activeTab}`) })}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("selectRecordsToLink")}
          </span>
        </div>
      </div>
      {/* Record list */}
      <div className="mt-4 flex flex-col gap-2">
        {activeTab === "audio" ? (
          <LoadingWrapper isLoading={audioLoading}>
            <AudioEvidencePicker data={audioItems} />
          </LoadingWrapper>
        ) : activeTab === "trees" ? (
          <LoadingWrapper isLoading={datasetLoading || occurrenceLoading || locationLoading}>
            <DatasetEvidencePicker
              datasets={datasetItems}
              occurrences={occurrenceItems}
              locations={locationItems}
              linkedDatasetUris={linkedTreeDatasetUris}
              timelineAttachmentsLoading={timelineAttachmentsLoading}
              timelineAttachmentsUnavailable={timelineAttachmentsUnavailable}
            />
          </LoadingWrapper>
        ) : activeTab === "biodiversity" ? (
          <LoadingWrapper isLoading={occurrenceLoading}>
            <BiodiversityEvidencePicker data={occurrenceItems} />
          </LoadingWrapper>
        ) : (
          <FileEvidencePicker />
        )}
      </div>
    </div>
  );
}
