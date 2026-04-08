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

import { useMemo, useCallback, useRef, useState } from "react";
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
const INVALIDATION_DELAY_MS = 5_000;

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

// ── Debug logging ─────────────────────────────────────────────────────────────
// Temporary verbose logging to trace the optimistic update race condition.
// Search for [ORGEDIT] in the browser console to filter these logs.
// Remove once the bug is confirmed fixed.

const DEBUG = true;
const t0 = typeof performance !== "undefined" ? performance.now() : 0;
function log(tag: string, ...args: unknown[]) {
  if (!DEBUG) return;
  const ms = (performance.now() - t0).toFixed(1);
  console.log(`[ORGEDIT +${ms}ms] ${tag}`, ...args);
}

// ── Component ─────────────────────────────────────────────────────────────────

let renderCount = 0;

export function UploadDashboardClient({ did }: UploadDashboardClientProps) {
  const indexerUtils = indexerTrpc.useUtils();
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";

  // Refs for object URLs that need cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // Guard: when true, the query is in the optimistic protection window.
  // During this period, refetchOnWindowFocus is disabled and we control
  // refetches explicitly via the delayed invalidation.
  const [optimisticGuard, setOptimisticGuard] = useState(false);

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
    dataUpdatedAt,
    isFetching,
    isStale,
    status,
  } = indexerTrpc.organization.byDid.useQuery({ did }, {
    // Override the global staleTime: 0 so that optimistic data set via
    // setQueryData is treated as fresh and doesn't trigger an immediate
    // background refetch on the next render (e.g. after URL change).
    staleTime: optimisticGuard ? Infinity : 10_000,
    // Disable automatic refetches during the optimistic protection window.
    // Without this, React Query can schedule a background refetch that races
    // against our setQueryData and overwrites optimistic data with stale
    // indexer results.
    refetchOnWindowFocus: !optimisticGuard,
    refetchOnMount: !optimisticGuard,
    refetchOnReconnect: !optimisticGuard,
  });
  const hasFetchedOrg = orgData?.org !== null && orgData?.org !== undefined;

  // Log every render with query state
  renderCount++;
  const displayName = orgData?.org?.record?.displayName;
  const shortDesc = orgData?.org?.record?.shortDescription;
  log("RENDER", {
    renderCount,
    mode,
    optimisticGuard,
    isFetching,
    isStale,
    status,
    dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
    displayName: typeof displayName === "string" ? displayName.slice(0, 40) : displayName,
    shortDesc: typeof shortDesc === "string" ? shortDesc.slice(0, 60) : (shortDesc ? "[object]" : null),
    isSaving,
  });

  // Derive OrganizationData from the query cache — single source of truth.
  // No useEffect sync, no Zustand serverData. When setQueryData updates the
  // cache, this memo recomputes and the component re-renders with new data.
  const serverData = useMemo(() => {
    if (!orgData?.org) return null;
    const result = orgInfoToOrganizationData(orgData.org as GraphQLOrgInfoItem, 0);
    log("MEMO serverData recomputed", {
      displayName: result.displayName?.slice(0, 40),
      shortDescription: result.shortDescription?.slice(0, 60),
    });
    return result;
  }, [orgData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = trpc.organization.info.update.useMutation();

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!serverData || !hasChanges() || isSaving) return;

    log("SAVE:start", { editedFields: Object.keys(edits).filter((k) => edits[k as keyof typeof edits] !== null) });

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

      log("SAVE:mutateAsync sending", { dataKeys: Object.keys(data) });

      // ── Send mutation and handle result inline ──────────────────────────
      // Using mutateAsync (instead of mutate + onSuccess) so we can properly
      // await cancel() before writing optimistic data to the cache.
      const result = await updateMutation.mutateAsync({ data });

      log("SAVE:mutateAsync resolved", {
        resultDisplayName: result.record?.displayName,
        resultShortDesc: typeof result.record?.shortDescription === "string"
          ? (result.record.shortDescription as string).slice(0, 60)
          : "[object/null]",
      });

      // ── Apply optimistic update to query cache ──────────────────────────
      const cachedQueryData = indexerUtils.organization.byDid.getData({ did });
      const cachedOrg = cachedQueryData?.org as GraphQLOrgInfoItem | null | undefined;
      if (!cachedOrg?.record) {
        log("SAVE:WARN no cached org record — fallback invalidate");
        // Shouldn't happen, but fall back to just clearing edit mode
        onSaveSuccess();
        setMode(null);
        void indexerUtils.organization.byDid.invalidate({ did });
        return;
      }

      log("SAVE:cache before setData", {
        cachedDisplayName: cachedOrg.record.displayName,
      });

      // Clean up any previous object URLs to avoid memory leaks.
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

      const rec = result.record;

      // 1. Enable the optimistic guard BEFORE cancelling/setting data.
      //    This flips the query options to staleTime: Infinity and disables
      //    all automatic refetches, so React Query cannot schedule any
      //    background fetches that would overwrite our optimistic data.
      log("SAVE:guard ON");
      setOptimisticGuard(true);

      // 2. Await cancel() — this ensures any in-flight refetch is fully
      //    aborted before we write to the cache. The previous approach used
      //    `void cancel()` (fire-and-forget), which allowed in-flight fetches
      //    to resolve and overwrite optimistic data almost immediately.
      log("SAVE:cancel() awaiting...");
      await indexerUtils.organization.byDid.cancel({ did });
      log("SAVE:cancel() done");

      // 3. Update the query cache directly — single source of truth.
      log("SAVE:setData() calling", {
        newDisplayName: rec.displayName,
        newShortDesc: typeof rec.shortDescription === "string"
          ? (rec.shortDescription as string).slice(0, 60)
          : "[object/null]",
      });
      indexerUtils.organization.byDid.setData({ did }, (prev) => {
        log("SAVE:setData() updater executing", {
          prevDisplayName: prev?.org?.record?.displayName,
        });
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

      // Verify cache was actually updated
      const verifyData = indexerUtils.organization.byDid.getData({ did });
      log("SAVE:setData() verify", {
        cachedDisplayNameAfter: verifyData?.org?.record?.displayName,
      });

      // 4. Reset edit state and clear edit mode.
      log("SAVE:onSaveSuccess + setMode(null)");
      onSaveSuccess();
      setMode(null);

      // 5. Lift the optimistic guard after a generous delay, then invalidate
      //    so the cache is refreshed with real CDN URLs from the indexer.
      //    The guard ensures no automatic refetch can race against our
      //    optimistic data during this window.
      log("SAVE:scheduling delayed invalidate", { delayMs: INVALIDATION_DELAY_MS });
      setTimeout(() => {
        log("SAVE:delayed invalidate firing — guard OFF");
        setOptimisticGuard(false);
        void indexerUtils.organization.byDid.invalidate({ did });
      }, INVALIDATION_DELAY_MS);

      log("SAVE:complete ✓");
    } catch (err) {
      log("SAVE:ERROR", err);
      setSaving(false);
      setSaveError(formatError(err));
    }
  }, [serverData, edits, hasChanges, isSaving, setSaving, setSaveError, onSaveSuccess, setMode, updateMutation, indexerUtils, did]);

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
