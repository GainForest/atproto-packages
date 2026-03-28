"use client";

/**
 * ProfileEditClient
 *
 * Edit page for the certified actor profile (app.certified.actor.profile).
 *
 * Mode is driven by the `?mode=` URL param (via nuqs):
 *   /upload/profile          → view mode (read-only preview)
 *   /upload/profile?mode=edit → edit mode (inline editing)
 *
 * Data sources:
 *   - Certified profile: fetched from the GraphQL indexer
 *   - Bluesky profile: fetched from the public Bluesky API for fallback fields
 *
 * For each field, we show whether the current value comes from the certified
 * profile or was imported from Bluesky (i.e. the certified profile doesn't
 * override it).
 *
 * Save uses `certified.actor.profile.upsert` because the record may or may
 * not exist yet — upsert handles both create and update.
 */

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { queries } from "@/lib/graphql/queries/index";
import type { CertifiedProfileData } from "@/lib/types";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import { formatError } from "@/lib/utils/trpc-errors";

import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import { EditableProfileHero, ProfileEditBar } from "./EditableProfileHero";
import { ProfileViewHero } from "./ProfileViewHero";
import { ProfileEditSkeleton } from "./ProfileEditSkeleton";
import { useProfileEditStore } from "./store";
import { useUploadMode } from "../../_hooks/useUploadMode";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileEditClientProps {
  /** The authenticated user's DID — obtained from server-side session. */
  did: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract a URL string from a JSON blob field.
 * Handles both pre-resolved URI strings and SmallImage/LargeImage wrappers.
 */
function extractImageUrl(blob: unknown): string | null {
  if (!blob) return null;
  if (typeof blob === "string") return blob;
  if (typeof blob === "object") {
    const obj = blob as Record<string, unknown>;
    // Direct URI
    if (typeof obj["uri"] === "string" && obj["uri"]) return obj["uri"];
    // SmallImage / LargeImage wrapper: { image: { uri: "..." } }
    if (typeof obj["image"] === "object" && obj["image"] !== null) {
      const nested = obj["image"] as Record<string, unknown>;
      if (typeof nested["uri"] === "string" && nested["uri"]) return nested["uri"];
    }
  }
  return null;
}

/**
 * Merge certified profile + Bluesky profile into a unified CertifiedProfileData.
 */
function mergeProfiles(
  did: string,
  certified: Awaited<ReturnType<typeof queries.certifiedProfile.fetch>>
): CertifiedProfileData {
  const cp = certified.certifiedProfile;
  const bp = certified.bskyProfile;

  const displayNameFromBluesky = !cp?.displayName && !!bp?.displayName;
  const descriptionFromBluesky = !cp?.description && !!bp?.description;
  const avatarFromBluesky = !extractImageUrl(cp?.avatar) && !!bp?.avatar;

  return {
    did,
    handle: bp?.handle ?? "",
    displayName: cp?.displayName ?? bp?.displayName ?? "",
    description: cp?.description ?? bp?.description ?? "",
    pronouns: cp?.pronouns ?? null,
    website: cp?.website ?? null,
    avatarUrl: extractImageUrl(cp?.avatar) ?? bp?.avatar ?? null,
    bannerUrl: extractImageUrl(cp?.banner) ?? null,
    createdAt: cp?.createdAt ?? "",
    displayNameFromBluesky,
    descriptionFromBluesky,
    avatarFromBluesky,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileEditClient({ did }: ProfileEditClientProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";

  // ── Store ───────────────────────────────────────────────────────────────────
  const serverData = useProfileEditStore((s) => s.serverData);
  const isSaving = useProfileEditStore((s) => s.isSaving);
  const setServerData = useProfileEditStore((s) => s.setServerData);
  const setSaving = useProfileEditStore((s) => s.setSaving);
  const setSaveError = useProfileEditStore((s) => s.setSaveError);
  const onSaveSuccess = useProfileEditStore((s) => s.onSaveSuccess);
  const edits = useProfileEditStore((s) => s.edits);
  const hasChanges = useProfileEditStore((s) => s.hasChanges);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data: fetchedProfile, isLoading, error } = useQuery({
    queryKey: ["profile-edit", did],
    queryFn: async () => {
      const result = await queries.certifiedProfile.fetch({ did });
      return mergeProfiles(did, result);
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (fetchedProfile) {
      setServerData(fetchedProfile);
    }
  }, [fetchedProfile, setServerData]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const upsertMutation = trpc.certified.actor.profile.upsert.useMutation({
    onSuccess: (result) => {
      // Update cache optimistically
      const current = queryClient.getQueryData<CertifiedProfileData | null>(["profile-edit", did]);
      if (current) {
        const rec = result.record;
        const avatarUrl = edits.avatar
          ? URL.createObjectURL(edits.avatar)
          : current.avatarUrl;
        const bannerUrl = edits.banner
          ? URL.createObjectURL(edits.banner)
          : current.bannerUrl;

        const optimistic: CertifiedProfileData = {
          ...current,
          displayName: rec.displayName ?? current.displayName,
          description: rec.description ?? current.description,
          pronouns: rec.pronouns ?? current.pronouns,
          website: rec.website ?? current.website,
          avatarUrl,
          bannerUrl,
          // Once saved to certified profile, fields are no longer "from Bluesky"
          displayNameFromBluesky: !rec.displayName && current.displayNameFromBluesky,
          descriptionFromBluesky: !rec.description && current.descriptionFromBluesky,
          avatarFromBluesky: !avatarUrl && current.avatarFromBluesky,
        };
        queryClient.setQueryData(["profile-edit", did], optimistic);
      }

      // Clear edit mode
      setMode(null);
      onSaveSuccess();

      // Background refetch
      void queryClient.invalidateQueries({ queryKey: ["profile-edit", did] });
    },
    onError: (mutationErr) => {
      setSaving(false);
      setSaveError(formatError(mutationErr));
    },
  });

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges() || isSaving) return;

    setSaving(true);
    setSaveError(null);

    // Build full record data for upsert — upsert needs all fields, not a patch.
    // Start from current server data and overlay edits.
    const data: Record<string, unknown> = {};

    // displayName — use edit or fallback to current
    data.displayName = edits.displayName ?? (serverData.displayName || undefined);

    // description
    data.description = edits.description ?? (serverData.description || undefined);

    // pronouns
    const pronouns = edits.pronouns ?? serverData.pronouns;
    if (pronouns) data.pronouns = pronouns;

    // website
    const website = edits.website ?? serverData.website;
    if (website) data.website = website;

    // avatar — new file or preserve existing (avatar blob is re-uploaded from PDS by mutation)
    if (edits.avatar !== null) {
      data.avatar = { image: await toSerializableFile(edits.avatar) };
    }

    // banner — new file
    if (edits.banner !== null) {
      data.banner = { image: await toSerializableFile(edits.banner) };
    }

    upsertMutation.mutate(data);
  }, [serverData, edits, hasChanges, isSaving, setSaving, setSaveError, upsertMutation]);

  // ── Render states ──────────────────────────────────────────��────────────────

  if (isLoading) {
    return <ProfileEditSkeleton />;
  }

  if (error) {
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load your profile"
          description="We had trouble fetching your profile data. Please try refreshing."
          error={error}
          showRefreshButton
          showHomeButton={false}
        />
      </Container>
    );
  }

  if (!serverData) {
    return <ProfileEditSkeleton />;
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <form
        id="profile-edit-save-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <Container className="pt-4 pb-8 space-y-2">
          <EditableProfileHero profile={serverData} />

          <AnimatePresence>
            <motion.div
              key="profile-edit-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <ProfileEditBar />
            </motion.div>
          </AnimatePresence>
        </Container>
      </form>
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────

  return (
    <Container className="pt-4 pb-8 space-y-2">
      <ProfileViewHero profile={serverData} showEditButton />
    </Container>
  );
}
