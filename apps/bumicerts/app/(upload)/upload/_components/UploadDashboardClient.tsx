"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { queries } from "@/lib/graphql/queries/index";
import { orgInfoToOrganizationData } from "@/lib/adapters";
import type { GraphQLOrgInfoItem } from "@/lib/adapters";

import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import { EditableHero, EditBar } from "./EditableHero/index";
import { EditableSubHero } from "./EditableSubHero/index";
import { EditableAbout } from "./EditableAbout";
import { SitesPreview } from "./SitesPreview";
import { BumicertsPreview } from "./BumicertsPreview";
import { UploadDashboardSkeleton } from "./UploadDashboardSkeleton";
import { useUploadDashboardStore } from "./store";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadDashboardClientProps {
  /** The authenticated user's DID — obtained from server-side session. */
  did: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadDashboardClient({ did }: UploadDashboardClientProps) {
  const queryClient = useQueryClient();

  // ── Store ───────────────────────────────────────────────────────────────────
  const serverData = useUploadDashboardStore((s) => s.serverData);
  const isEditing = useUploadDashboardStore((s) => s.isEditing);
  const isSaving = useUploadDashboardStore((s) => s.isSaving);
  const setServerData = useUploadDashboardStore((s) => s.setServerData);
  const startEditing = useUploadDashboardStore((s) => s.startEditing);
  const setSaving = useUploadDashboardStore((s) => s.setSaving);
  const setSaveError = useUploadDashboardStore((s) => s.setSaveError);
  const onSaveSuccess = useUploadDashboardStore((s) => s.onSaveSuccess);
  const edits = useUploadDashboardStore((s) => s.edits);
  const hasChanges = useUploadDashboardStore((s) => s.hasChanges);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data: fetchedOrg, isLoading, error } = useQuery({
    queryKey: ["org-dashboard", did],
    queryFn: async () => {
      const result = await queries.organization.fetch({ did });
      if (!("org" in result) || !result.org) return null;
      return orgInfoToOrganizationData(result.org as GraphQLOrgInfoItem, 0);
    },
    staleTime: 60 * 1000,
  });

  // Sync fetched data into the store
  useEffect(() => {
    if (fetchedOrg) {
      setServerData(fetchedOrg);
    }
  }, [fetchedOrg, setServerData]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const upsertMutation = trpc.organization.info.upsert.useMutation({
    onSuccess: (result) => {
      // Build updated OrganizationData from the mutation result
      // The record returned has the latest state — re-adapt it
      const updatedOrg = orgInfoToOrganizationData(
        {
          metadata: { did, rkey: "self", uri: result.uri, cid: result.cid, indexedAt: null, createdAt: result.record.createdAt ?? null },
          creatorInfo: null,
          record: {
            displayName: result.record.displayName ?? null,
            shortDescription: result.record.shortDescription ?? null,
            longDescription: result.record.longDescription ?? null,
            logo: null,
            coverImage: null,
            objectives: result.record.objectives ?? null,
            country: result.record.country ?? null,
            website: result.record.website ?? null,
            startDate: result.record.startDate ?? null,
            visibility: result.record.visibility ?? null,
            createdAt: result.record.createdAt ?? null,
          },
        } as GraphQLOrgInfoItem,
        serverData?.bumicertCount ?? 0
      );
      onSaveSuccess(updatedOrg);
      // Invalidate the dashboard query so next load is fresh
      void queryClient.invalidateQueries({ queryKey: ["org-dashboard", did] });
    },
    onError: (err) => {
      setSaving(false);
      setSaveError(err.message ?? "Failed to save. Please try again.");
    },
  });

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges() || isSaving) return;

    setSaving(true);
    setSaveError(null);

    // Build the upsert input — merge edits over current server values.
    // Upsert uses the full create input shape (not partial).
    // Files go through the blob pipeline inside the mutation layer.
    const input = {
      displayName: edits.displayName ?? serverData.displayName,
      shortDescription: edits.shortDescription ?? serverData.shortDescription
        ? { text: edits.shortDescription ?? serverData.shortDescription }
        : undefined,
      longDescription: edits.longDescription ?? serverData.longDescription
        ? edits.longDescription ?? serverData.longDescription
        : undefined,
      objectives: serverData.objectives,
      country: edits.country ?? serverData.country ?? undefined,
      website: edits.website !== null
        ? (edits.website ?? serverData.website ?? undefined)
        : undefined,
      startDate: edits.startDate !== null
        ? (edits.startDate ?? serverData.startDate ?? undefined)
        : undefined,
      visibility: edits.visibility ?? serverData.visibility,
      // File inputs — passed as SerializableFile via the blob pipeline
      ...(edits.logo ? { logo: edits.logo } : {}),
      ...(edits.coverImage ? { coverImage: edits.coverImage } : {}),
    };

    upsertMutation.mutate(input);
  }, [
    serverData,
    edits,
    hasChanges,
    isSaving,
    setSaving,
    setSaveError,
    upsertMutation,
  ]);

  // ── Render states ───────────────────────────────────────────────────────────

  if (isLoading || !serverData) {
    return <UploadDashboardSkeleton />;
  }

  if (error) {
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load your organisation"
          description="We had trouble fetching your organisation data. Please try refreshing."
          error={error}
          showRefreshButton
          showHomeButton={false}
        />
      </Container>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    // Hidden form — the EditBar's save button submits this form, which
    // triggers handleSave via the onSubmit handler.
    <form
      id="upload-dashboard-save-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <Container className="pt-4 pb-8 space-y-2">
        {/* Hero — editable cover image, logo, name, short description */}
        <EditableHero organization={serverData} />

        {/* Edit bar — shown only when isEditing */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              key="edit-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <EditBar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* SubHero chips — country, date, website, visibility */}
        <EditableSubHero organization={serverData} />

        {/* Long description */}
        <EditableAbout organization={serverData} />

        {/* Edit button — only shown in view mode */}
        {!isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit profile
            </button>
          </motion.div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent pt-4" />

        {/* Sites preview */}
        <SitesPreview />

        {/* Bumicerts preview */}
        <BumicertsPreview organization={serverData} />
      </Container>
    </form>
  );
}
