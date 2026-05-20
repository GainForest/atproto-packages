"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { EvidenceAdder } from "../timeline/EvidenceAdder";
import {
  getEntriesForActivity,
  getLinkedTreeDatasetUris,
} from "../timeline/shared/linkedTreeDatasetEvidence";
import { TimelinePanel } from "../timeline/viewers/TimelinePanel";

interface TimelineTabProps {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  isOwner: boolean;
}

export function TimelineTab({
  organizationDid,
  activityUri,
  activityCid,
  bumicertTitle,
  isOwner,
}: TimelineTabProps) {
  const t = useTranslations("bumicert.detail.timeline");
  const { data, isError, isLoading } = indexerTrpc.context.attachments.useQuery({
    did: organizationDid,
  });

  const entries = useMemo(
    () => getEntriesForActivity(data, activityUri),
    [data, activityUri],
  );
  const linkedTreeDatasetUris = useMemo(
    () => getLinkedTreeDatasetUris(entries),
    [entries],
  );
  const timelineAttachmentsUnavailable =
    isError || (!isLoading && data === undefined);

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div className="flex flex-col gap-6">
        {isOwner && (
          <section
            aria-labelledby="link-evidence-heading"
            className="rounded-3xl border border-primary/25 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {t("ownerTools")}
                </p>
                <h2
                  id="link-evidence-heading"
                  className="mt-1 text-2xl tracking-tight text-foreground"
                >
                  {t("linkEvidenceTitle")}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {t("linkEvidenceDescription", { title: bumicertTitle })}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-primary/25 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                {t("notTimelineYet")}
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-xs">
              <EvidenceAdder
                activityUri={activityUri}
                activityCid={activityCid}
                bumicertTitle={bumicertTitle}
                organizationDid={organizationDid}
                linkedTreeDatasetUris={linkedTreeDatasetUris}
                timelineAttachmentsLoading={isLoading}
                timelineAttachmentsUnavailable={timelineAttachmentsUnavailable}
              />
            </div>
          </section>
        )}
        <TimelinePanel
          entries={entries}
          isLoading={isLoading}
          isOwner={isOwner}
          organizationDid={organizationDid}
        />
      </div>
    </motion.div>
  );
}
