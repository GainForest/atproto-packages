"use client";

/**
 * UploadDashboardClient
 *
 * Mode is driven entirely by the `?mode=` URL param (via nuqs):
 *
 * /upload          → view mode  (OrgHero + OrgAbout, read-only)
 * /upload?mode=edit → edit mode  (EditableHero + EditableAbout + EditBar)
 *
 * nuqs is the single source of truth — no Zustand isEditing flag, no
 * useEffect sync, no re-trigger bugs. Cancel simply clears the param.
 *
 * Save uses `organization.info.update` (not upsert) because the record is
 * guaranteed to exist when the user reaches /upload. The update mutation
 * fetches the existing record server-side and applies a partial patch, so
 * we only send the fields that actually changed. This means:
 *   - logo / coverImage are preserved from the PDS record when not re-uploaded
 *   - website / startDate are preserved unless explicitly changed
 *
 * On success:
 *   1. The query cache is updated immediately via setQueryData with optimistic
 *      data (text fields from the mutation result + object URLs for new images).
 *      This ensures the user never sees stale data, even across URL changes.
 *   2. The mode param is cleared (returns to view mode).
 *   3. The query is invalidated after a delay so a background refetch replaces
 *      the optimistic data with real CDN URLs once the indexer has processed it.
 */

import { useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { orgInfoToOrganizationData } from "@/lib/adapters";
import type { GraphQLOrgInfoItem } from "@/lib/adapters";
import type { OrganizationData } from "@/lib/types";
import type { Richtext } from "@gainforest/atproto-mutations-next";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import { $parse as parseLinearDocument } from "@gainforest/generated/pub/leaflet/pages/linearDocument.defs";
import { formatError } from "@/lib/utils/trpc-errors";

import Container from "@/components/ui/container";
import ErrorPage from "@/components/error-page";
import { OrgHero } from "@/app/(marketplace)/organization/[did]/_components/OrgHero";
import { OrgAbout } from "@/app/(marketplace)/organization/[did]/_components/OrgAbout";
import { EditableHero, EditBar } from "./EditableHero/index";
import { EditableAbout } from "./EditableAbout";
import { UploadNavGrid } from "./UploadNavGrid";
import { UploadDashboardSkeleton } from "./UploadDashboardSkeleton";
import { OrgSetupPrompt } from "./OrgSetupPrompt";
import { useUploadDashboardStore } from "./store";
import { useUploadMode } from "../_hooks/useUploadMode";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadDashboardClientProps {
  /** The authenticated user's DID — obtained from server-side session. */
  did: string;
}

/**
 * Delay before invalidating the query after a successful save.
 * Gives the indexer time to process the update so the first refetch is more
 * likely to return current data. Even if it doesn't, the optimistic data
 * in the query cache is preserved until a matching refetch arrives.
 */
const INVALIDATION_DELAY_MS = 2_000;

function normalizeLongDescriptionBlobRefs(
  doc: OrganizationData["longDescription"]
): OrganizationData["longDescription"] {
  return {
    ...doc,
    blocks: doc.blocks.map((wrapper) => {
      const block = wrapper.block;
      if (block.$type !== "pub.leaflet.blocks.image") return wrapper;
      const image = block.image as Record<string, unknown>;
      const ref = image["ref"];
      if (typeof ref === "object" && ref !== null) {
        const link = (ref as Record<string, unknown>)["$link"];
        if (typeof link === "string" && link.length > 0) {
          const mimeType =
            typeof image["mimeType"] === "string"
              ? image["mimeType"]
              : "application/octet-stream";
          const size =
            typeof image["size"] === "number" ? image["size"] : 0;
          return {
            ...wrapper,
            block: {
              ...block,
              image: {
                $type: "blob",
                ref: link,
                mimeType,
                size,
              },
            },
          };
        }
      }
      return wrapper;
    }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadDashboardClient({ did }: UploadDashboardClientProps) {
  const indexerUtils = indexerTrpc.useUtils();
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";

  // Refs for object URLs that need cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // ── Store (edit-only state) ────────────────────────────────────────────────
  const isSaving = useUploadDashboardStore((s) => s.isSaving);
  const setSaving = useUploadDashboardStore((s) => s.setSaving);
  const setSaveError = useUploadDashboardStore((s) => s.setSaveError);
  const onSaveSuccess = useUploadDashboardStore((s) => s.onSaveSuccess);
  const edits = useUploadDashboardStore((s) => s.edits);
  const hasChanges = useUploadDashboardStore((s) => s.hasChanges);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const {
    data: orgData,
    isLoading,
    error,
  } = indexerTrpc.organization.byDid.useQuery({ did }, {
    // Override the global staleTime: 0 so that optimistic data set via
    // setQueryData is treated as fresh and doesn't trigger an immediate
    // background refetch on the next render (e.g. after URL change).
    // We control refetches explicitly via invalidate() after a delay.
    staleTime: 10_000,
  });
  const hasFetchedOrg = orgData?.org !== null && orgData?.org !== undefined;

  // Derive OrganizationData from the query cache — single source of truth.
  // No useEffect sync, no Zustand serverData. When setQueryData updates the
  // cache, this memo recomputes and the component re-renders with new data.
  const serverData = useMemo(() => {
    if (!orgData?.org) return null;
    return orgInfoToOrganizationData(orgData.org as GraphQLOrgInfoItem, 0);
  }, [orgData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = trpc.organization.info.update.useMutation({
    onSuccess: (result) => {
      // 1. Read the current query cache to use as the base for optimistic data.
      const cachedQueryData = indexerUtils.organization.byDid.getData({ did });
      const cachedOrg = cachedQueryData?.org as GraphQLOrgInfoItem | null | undefined;
      if (!cachedOrg?.record) {
        // Shouldn't happen, but fall back to just clearing edit mode
        onSaveSuccess();
        setMode(null);
        void indexerUtils.organization.byDid.invalidate({ did });
        return;
      }

      // 2. Build optimistic image URLs: object URL if a new file was uploaded,
      //    otherwise keep whatever was already in the cache.
      //    Clean up any previous object URLs to avoid memory leaks.
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];

      const currentRecord = cachedOrg.record;
      let optimisticLogo = currentRecord.logo;
      let optimisticCoverImage = currentRecord.coverImage;

      if (edits.logo) {
        const logoUrl = URL.createObjectURL(edits.logo);
        objectUrlsRef.current.push(logoUrl);
        optimisticLogo = {
          cid: currentRecord.logo?.cid ?? null,
          mimeType: (edits.logo.type || currentRecord.logo?.mimeType) ?? null,
          size: edits.logo.size ?? currentRecord.logo?.size ?? null,
          uri: logoUrl,
        };
      }

      if (edits.coverImage) {
        const coverUrl = URL.createObjectURL(edits.coverImage);
        objectUrlsRef.current.push(coverUrl);
        optimisticCoverImage = {
          cid: currentRecord.coverImage?.cid ?? null,
          mimeType: (edits.coverImage.type || currentRecord.coverImage?.mimeType) ?? null,
          size: edits.coverImage.size ?? currentRecord.coverImage?.size ?? null,
          uri: coverUrl,
        };
      }

      // 3. Build optimistic values from the mutation result (authoritative for
      //    text/scalar fields) and the edit state (for images).
      const rec = result.record;

      // 4. Cancel any in-flight or queued refetches BEFORE setting optimistic
      //    data. With staleTime: 0 (the global default), React Query considers
      //    data stale immediately and will trigger a background refetch on any
      //    re-render (e.g. from the URL change below). That refetch would return
      //    stale indexer data and overwrite our optimistic update. Cancelling
      //    first ensures no pending fetch can race against us.
      void indexerUtils.organization.byDid.cancel({ did });

      // 5. Update the query cache directly. This is the React Query "true
      //    optimistic update" pattern — the cache is the single source of truth,
      //    and our useMemo above will recompute `serverData` immediately.
      //
      //    The updater receives the exact cache type and returns the same shape.
      //    Only specific record fields are overridden — everything else (metadata,
      //    activities, creatorInfo) passes through unchanged.
      indexerUtils.organization.byDid.setData({ did }, (prev) => {
        if (!prev?.org?.record) return prev;
        const prevRecord = prev.org.record;
        return {
          ...prev,
          org: {
            ...prev.org,
            record: {
              ...prevRecord,
              displayName: rec.displayName ?? prevRecord.displayName,
              shortDescription: rec.shortDescription ?? prevRecord.shortDescription,
              longDescription: rec.longDescription ?? prevRecord.longDescription,
              country: rec.country ?? prevRecord.country,
              website: rec.website ?? prevRecord.website,
              startDate: rec.startDate ?? prevRecord.startDate,
              visibility: rec.visibility ?? prevRecord.visibility,
              logo: optimisticLogo,
              coverImage: optimisticCoverImage,
            },
          },
        };
      });

      // 6. Reset edit state and clear edit mode.
      onSaveSuccess();
      setMode(null);

      // 7. Invalidate after a generous delay so the indexer has time to process
      //    the update. The query cache already holds the optimistic data, so the
      //    user never sees stale values. When the refetch arrives with real CDN
      //    URLs, it simply replaces the object URLs.
      //
      //    IMPORTANT: We also cancel again right before invalidating. Between
      //    steps 4–7, React Query may have scheduled another automatic refetch
      //    (e.g. from refetchOnWindowFocus, refetchOnMount on re-render, or
      //    staleTime expiring). Cancelling ensures only our controlled invalidate
      //    triggers the actual network request.
      setTimeout(() => {
        void indexerUtils.organization.byDid.cancel({ did }).then(() => {
          void indexerUtils.organization.byDid.invalidate({ did });
        });
      }, INVALIDATION_DELAY_MS);
    },
    onError: (mutationErr) => {
      setSaving(false);
      setSaveError(formatError(mutationErr));
    },
  });

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges() || isSaving) return;

    setSaving(true);
    setSaveError(null);

    try {
      // Build partial data — only include fields that were actually edited.
      // The update mutation fetches the existing record from the PDS and merges
      // this patch, so omitted fields are preserved automatically.
      const data: Record<string, unknown> = {};

      if (edits.displayName !== null) {
        data.displayName = edits.displayName;
      }

      if (edits.shortDescription !== null) {
        const resolvedFacets = edits.shortDescriptionFacets ?? serverData.shortDescriptionFacets;
        // Our Facet[] (from leaflet-react) and the generated RichtextFacet.Main[] are
        // structurally identical at runtime (same app.bsky.richtext.facet JSON shape).
        // Cast at this mutation boundary — safe by structural equivalence.
        const shortDescriptionInput: Richtext = {
          text: edits.shortDescription,
          facets: resolvedFacets.length > 0
            ? resolvedFacets as unknown as Richtext["facets"]
            : undefined,
        };
        data.shortDescription = shortDescriptionInput;
      }

      if (edits.longDescription !== null) {
        const normalizedLongDescription = normalizeLongDescriptionBlobRefs(edits.longDescription);
        // Parse through generated lexicon validator client-side so this payload is
        // guaranteed to match mutation input shape before we send it.
        data.longDescription = parseLinearDocument(normalizedLongDescription);
      }

      if (edits.country !== null) {
        data.country = edits.country;
      }

      if (edits.visibility !== null) {
        data.visibility = edits.visibility;
      }

      // null in store = "unchanged" — omit from the patch so the update
      // mutation preserves the existing PDS value automatically.
      if (edits.website !== null) {
        data.website = edits.website as `${string}:${string}`;
      }

      if (edits.startDate !== null) {
        // Convert YYYY-MM-DD to full ISO datetime format
        data.startDate = `${edits.startDate}T00:00:00.000Z` as `${string}-${string}-${string}T${string}:${string}:${string}Z`;
      }

      // Images must be wrapped in SmallImage shape { image: SerializableFile }
      // so that resolveFileInputs can upload the file and replace it with a BlobRef.
      if (edits.logo !== null) {
        data.logo = { image: await toSerializableFile(edits.logo) };
      }

      if (edits.coverImage !== null) {
        data.coverImage = { image: await toSerializableFile(edits.coverImage) };
      }

      updateMutation.mutate({ data });
    } catch (err) {
      setSaving(false);
      setSaveError(formatError(err));
    }
  }, [serverData, edits, hasChanges, isSaving, setSaving, setSaveError, updateMutation]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
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

  // Organization doesn't exist yet — prompt user to set it up
  if (!hasFetchedOrg && !serverData) {
    return (
      <Container className="pt-4">
        <OrgSetupPrompt did={did} />
      </Container>
    );
  }

  // Still waiting for serverData to be derived from query
  if (!serverData) {
    return <UploadDashboardSkeleton />;
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <form
        id="upload-dashboard-save-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <Container className="pt-4 pb-8 space-y-2">
          <EditableHero organization={serverData} />

          <AnimatePresence>
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
          </AnimatePresence>

          <EditableAbout organization={serverData} />
        </Container>
      </form>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────

  return (
    <Container className="pt-4 pb-8 space-y-2">
      <OrgHero organization={serverData} showEditButton />
      <OrgAbout organization={serverData} />
      <UploadNavGrid />
    </Container>
  );
}
