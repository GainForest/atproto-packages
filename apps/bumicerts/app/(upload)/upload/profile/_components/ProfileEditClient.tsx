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
 * Save strategy:
 *   - If a certified profile already exists → uses `update` (partial patch,
 *     preserves unchanged fields like avatar/banner automatically).
 *   - If no certified profile exists yet → uses `upsert` (creates the record).
 *   We detect existence from the fetched data.
 */

import { useEffect, useCallback, useRef } from "react";
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
import { useProfileEditStore, useHasChanges, FIELD_CLEARED } from "./store";
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

/** Query key used for the profile edit data — matches the queries registry pattern. */
const profileQueryKey = (did: string) => ["certifiedProfile", { did }] as const;

/**
 * Merge certified profile + Bluesky profile into a unified CertifiedProfileData.
 */
function mergeProfiles(
  did: string,
  certified: Awaited<ReturnType<typeof queries.certifiedProfile.fetch>>
): CertifiedProfileData & { _hasCertifiedProfile: boolean } {
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
    // Track whether a certified profile record exists in the PDS
    _hasCertifiedProfile: cp !== null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileEditClient({ did }: ProfileEditClientProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";

  // Track whether a certified profile already exists (for update vs upsert)
  const hasCertifiedProfile = useRef(false);

  // ── Store ───────────────────────────────────────────────────────────────────
  const serverData = useProfileEditStore((s) => s.serverData);
  const isSaving = useProfileEditStore((s) => s.isSaving);
  const setServerData = useProfileEditStore((s) => s.setServerData);
  const setSaving = useProfileEditStore((s) => s.setSaving);
  const setSaveError = useProfileEditStore((s) => s.setSaveError);
  const onSaveSuccess = useProfileEditStore((s) => s.onSaveSuccess);
  const edits = useProfileEditStore((s) => s.edits);
  const hasChanges = useHasChanges();

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data: fetchedProfile, isLoading, error } = useQuery({
    queryKey: profileQueryKey(did),
    queryFn: async () => {
      const result = await queries.certifiedProfile.fetch({ did });
      return mergeProfiles(did, result);
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (fetchedProfile) {
      setServerData(fetchedProfile);
      hasCertifiedProfile.current = fetchedProfile._hasCertifiedProfile;
    }
  }, [fetchedProfile, setServerData]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  // Shared success handler for both update and upsert
  const handleMutationSuccess = useCallback((result: { record: Record<string, unknown> }) => {
    // Snapshot edits before clearing — onSaveSuccess resets them
    const currentEdits = useProfileEditStore.getState().edits;
    const current = queryClient.getQueryData<CertifiedProfileData | null>(profileQueryKey(did));

    if (current) {
      const rec = result.record;

      // Only create object URLs if user uploaded new files
      const avatarUrl = currentEdits.avatar
        ? URL.createObjectURL(currentEdits.avatar)
        : current.avatarUrl;
      const bannerUrl = currentEdits.banner
        ? URL.createObjectURL(currentEdits.banner)
        : current.bannerUrl;

      const optimistic: CertifiedProfileData = {
        ...current,
        displayName: (rec.displayName as string) ?? current.displayName,
        description: (rec.description as string) ?? current.description,
        pronouns: (rec.pronouns as string) ?? null,
        website: (rec.website as string) ?? null,
        avatarUrl,
        bannerUrl,
        // Once saved to certified profile, fields are no longer "from Bluesky"
        displayNameFromBluesky: false,
        descriptionFromBluesky: false,
        avatarFromBluesky: false,
      };
      queryClient.setQueryData(profileQueryKey(did), optimistic);
    }

    // Clear edit mode
    setMode(null);
    onSaveSuccess();

    // Now the profile exists
    hasCertifiedProfile.current = true;

    // Background refetch to get real CDN URLs
    void queryClient.invalidateQueries({ queryKey: profileQueryKey(did) });
  }, [did, queryClient, setMode, onSaveSuccess]);

  const handleMutationError = useCallback((mutationErr: unknown) => {
    setSaving(false);
    setSaveError(formatError(mutationErr));
  }, [setSaving, setSaveError]);

  const updateMutation = trpc.certified.actor.profile.update.useMutation({
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });

  const upsertMutation = trpc.certified.actor.profile.upsert.useMutation({
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges || isSaving) return;

    setSaving(true);
    setSaveError(null);

    if (hasCertifiedProfile.current) {
      // ── UPDATE path: send only changed fields as a partial patch ──────────
      // The update mutation fetches the existing record from the PDS and merges,
      // so omitted fields (like avatar/banner) are preserved automatically.
      const data: Record<string, unknown> = {};
      const unset: string[] = [];

      if (edits.displayName !== null) {
        data.displayName = edits.displayName;
      }

      if (edits.description !== null) {
        data.description = edits.description;
      }

      if (edits.pronouns !== null) {
        if (edits.pronouns === FIELD_CLEARED) {
          unset.push("pronouns");
        } else {
          data.pronouns = edits.pronouns;
        }
      }

      if (edits.website !== null) {
        if (edits.website === FIELD_CLEARED) {
          unset.push("website");
        } else {
          data.website = edits.website as `${string}:${string}`;
        }
      }

      if (edits.avatar !== null) {
        data.avatar = { image: await toSerializableFile(edits.avatar) };
      }

      if (edits.banner !== null) {
        data.banner = { image: await toSerializableFile(edits.banner) };
      }

      updateMutation.mutate({ data, unset });
    } else {
      // ── UPSERT path: first-time creation, send all available fields ──────
      const data: Record<string, unknown> = {};

      const displayName = edits.displayName ?? (serverData.displayName || undefined);
      if (displayName) data.displayName = displayName;

      const description = edits.description ?? (serverData.description || undefined);
      if (description) data.description = description;

      const pronouns = edits.pronouns;
      if (pronouns && pronouns !== FIELD_CLEARED) data.pronouns = pronouns;

      const website = edits.website;
      if (website && website !== FIELD_CLEARED) data.website = website;

      if (edits.avatar !== null) {
        data.avatar = { image: await toSerializableFile(edits.avatar) };
      }

      if (edits.banner !== null) {
        data.banner = { image: await toSerializableFile(edits.banner) };
      }

      upsertMutation.mutate(data);
    }
  }, [serverData, edits, hasChanges, isSaving, setSaving, setSaveError, updateMutation, upsertMutation]);

  // ── Render states ───────────────────────────────────────────────────────────

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
