"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  FilePenLineIcon,
  Loader2Icon,
} from "lucide-react";

import CircularProgressBar from "@/components/circular-progressbar";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import TimeText from "@/components/time-text";
import { useQuery } from "@tanstack/react-query";
import { links } from "@/lib/links";
import { queryKeys } from "@/lib/query-keys";
import type {
  DraftBumicertData,
  DraftBumicertResponse,
  GetDraftBumicertResponse,
} from "@/app/api/supabase/drafts/bumicert/type";

async function fetchDrafts(): Promise<DraftBumicertResponse[]> {
  const res = await fetch(links.api.drafts.bumicert.get(), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    const payload: unknown = await res.json().catch(() => null);
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Failed to fetch drafts";
    throw new Error(errorMessage);
  }
  const data: GetDraftBumicertResponse = await res.json();
  if (!data.success || !data.drafts)
    throw new Error("Invalid response from server");
  return data.drafts;
}

const hasDescriptionBlocks = (description: DraftBumicertData["description"]) => {
  if (typeof description !== "object" || description === null) return false;

  return (
    "blocks" in description &&
    Array.isArray(description.blocks) &&
    description.blocks.length > 0
  );
};

const calculateProgress = (data: DraftBumicertData): number => {
  const descriptionFilled =
    typeof data.description === "string"
      ? data.description.trim().length > 0
      : hasDescriptionBlocks(data.description);

  const fields = [
    data.title,
    data.startDate,
    data.endDate,
    data.workScopes?.length,
    data.coverImage,
    descriptionFilled || undefined,
    data.shortDescription,
    data.contributors?.length,
    data.siteBoundaries?.length,
  ];

  const filledFields = fields.filter(
    (field) => field !== undefined && field !== null && field !== "",
  ).length;

  return Math.round((filledFields / fields.length) * 100);
};

const DraftStatus = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center text-muted-foreground">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-serif text-2xl font-medium tracking-[-0.02em] text-foreground">
        {title}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-6">{description}</p>
    </div>
  );
};

const DraftBumicerts = () => {
  const auth = useAtprotoStore((state) => state.auth);

  const {
    data: drafts,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.drafts.byDid(auth.user?.did),
    queryFn: fetchDrafts,
    enabled: auth.authenticated && !!auth.user?.did,
  });

  const draftsWithProgress = useMemo(() => {
    if (!drafts) return [];
    return drafts.map((draft) => ({
      ...draft,
      title: draft.data.title || "Untitled Draft",
      progress: calculateProgress(draft.data),
    }));
  }, [drafts]);

  if (!auth.authenticated) {
    return (
      <DraftStatus
        icon={<AlertCircleIcon className="size-8" />}
        title="Sign in to view drafts"
        description="Draft Bumicerts are saved to your account so you can continue your work later."
      />
    );
  }

  if (isLoading) {
    return (
      <DraftStatus
        icon={<Loader2Icon className="size-8 animate-spin" />}
        title="Loading drafts"
        description="We are checking for saved Bumicert applications."
      />
    );
  }

  if (error) {
    return (
      <DraftStatus
        icon={<AlertCircleIcon className="size-8" />}
        title="Couldn't load drafts"
        description={
          error instanceof Error
            ? error.message
            : "Failed to load drafts. Please try again."
        }
      />
    );
  }

  if (draftsWithProgress.length === 0) {
    return (
      <DraftStatus
        icon={<FilePenLineIcon className="size-8" />}
        title="No drafts yet"
        description="Start a new Bumicert and save it as a draft when you want to return later."
      />
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-4">
      {draftsWithProgress.map((draft) => (
        <div
          key={draft.id}
          className="flex w-full items-center rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/40"
        >
          <CircularProgressBar value={draft.progress} size={42} />
          <div className="ml-3 flex min-w-0 flex-1 flex-col">
            <h3 className="truncate font-medium text-foreground">
              {draft.title}
            </h3>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <ClockIcon className="size-3" />
              <TimeText date={new Date(draft.updated_at)} />
            </p>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            asChild
          >
            <Link href={links.bumicert.createWithDraftId(draft.id.toString())}>
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
};

export default DraftBumicerts;
