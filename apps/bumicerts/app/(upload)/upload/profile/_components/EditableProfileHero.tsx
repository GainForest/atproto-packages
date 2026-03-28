"use client";

/**
 * EditableProfileHero — The certified profile hero card with full in-place editing.
 *
 * Every field becomes directly editable:
 *   - Banner        → "Change banner" button
 *   - Avatar        → pencil badge on the avatar
 *   - Display name  → inline <input>
 *   - Description   → inline <textarea>
 *   - Pronouns      → inline <input>
 *   - Website       → click → modal
 *
 * Also shows DataSourceBadge for fields that are currently imported from Bluesky
 * vs stored in the certified profile.
 *
 * Also exports ProfileEditBar — the save / cancel action row.
 */

import Image from "next/image";
import { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlobeIcon,
  ImageIcon,
  PencilIcon,
  PlusCircleIcon,
  SaveIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { ImageEditorModal } from "../../_modals/ImageEditorModal";
import { WebsiteEditorModal } from "../../_modals/WebsiteEditorModal";
import { useProfileEditStore } from "./store";
import { useUploadMode } from "../../_hooks/useUploadMode";
import type { CertifiedProfileData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "./DataSourceBadge";

// ── EditableProfileHero ──────────────────────────────────────────────────────

interface EditableProfileHeroProps {
  profile: CertifiedProfileData;
}

export function EditableProfileHero({ profile }: EditableProfileHeroProps) {
  const { pushModal, show } = useModal();
  const [mode] = useUploadMode();
  const isEditing = mode === "edit";

  const edits = useProfileEditStore((s) => s.edits);
  const setEdit = useProfileEditStore((s) => s.setEdit);

  // Resolved display values — edit buffer takes priority
  const displayName = edits.displayName ?? profile.displayName;
  const description = edits.description ?? profile.description;
  const pronouns = edits.pronouns ?? profile.pronouns;
  const website = edits.website ?? profile.website;

  // Image sources — use object URL for newly selected files
  const bannerObjectUrl = useMemo(
    () => (edits.banner ? URL.createObjectURL(edits.banner) : null),
    [edits.banner],
  );
  const avatarObjectUrl = useMemo(
    () => (edits.avatar ? URL.createObjectURL(edits.avatar) : null),
    [edits.avatar],
  );

  // Revoke blob URLs when the File changes or component unmounts
  useEffect(() => {
    return () => {
      if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
    };
  }, [bannerObjectUrl]);
  useEffect(() => {
    return () => {
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);
    };
  }, [avatarObjectUrl]);

  const bannerUrl = bannerObjectUrl ?? profile.bannerUrl;
  const avatarUrl = avatarObjectUrl ?? profile.avatarUrl;
  const initial = displayName?.charAt(0)?.toUpperCase() ?? "?";

  // Track "from Bluesky" status — once the user edits a field, it's no longer from Bluesky
  const displayNameFromBluesky = edits.displayName === null && profile.displayNameFromBluesky;
  const descriptionFromBluesky = edits.description === null && profile.descriptionFromBluesky;
  const avatarFromBluesky = edits.avatar === null && profile.avatarFromBluesky;

  // ── Modal openers ──────────────────────────────────────────────────────────

  const openBannerEditor = () => {
    pushModal(
      {
        id: MODAL_IDS.PROFILE_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="cover"
            onConfirm={(file) => setEdit("banner", file)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openAvatarEditor = () => {
    pushModal(
      {
        id: MODAL_IDS.PROFILE_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="logo"
            onConfirm={(file) => setEdit("avatar", file)}
          />
        ),
      },
      true,
    );
    show();
  };

  const openWebsite = () => {
    pushModal(
      {
        id: MODAL_IDS.PROFILE_WEBSITE_EDITOR,
        content: (
          <WebsiteEditorModal
            currentUrl={website}
            onConfirm={(url) => setEdit("website", url)}
          />
        ),
      },
      true,
    );
    show();
  };

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* ── Banner image (z-0) ── */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={`${displayName} banner`}
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
          ) : (
            <div
              className="absolute inset-0 bg-muted"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 50%, oklch(0.5 0.07 220 / 0.08) 0%, transparent 60%), radial-gradient(circle at 75% 25%, oklch(0.5 0.07 220 / 0.05) 0%, transparent 50%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-background/0 via-background/75 to-background" />
        </motion.div>
      </div>

      {/* ── Bottom content (z-10) ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="max-w-3xl">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={56}
                    height={56}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {initial}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={openAvatarEditor}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm hover:bg-muted/60 transition-colors cursor-pointer"
                  aria-label="Change avatar"
                >
                  <PencilIcon className="h-2.5 w-2.5" />
                </button>
              )}
              {avatarFromBluesky && (
                <DataSourceBadge fromBluesky className="absolute -top-1 -right-6" />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setEdit("displayName", e.target.value || null)}
                    placeholder="Display name"
                    className={cn(
                      "text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none",
                      "bg-transparent border-b-2 border-white/40 focus:border-primary/60 outline-none",
                      "text-foreground placeholder:text-foreground/40 w-full max-w-lg transition-colors",
                    )}
                    style={{ fontFamily: "var(--font-garamond-var)" }}
                  />
                ) : (
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground"
                    style={{ fontFamily: "var(--font-garamond-var)" }}
                  >
                    {displayName || profile.handle}
                  </h1>
                )}
                <DataSourceBadge fromBluesky={displayNameFromBluesky} />
              </div>
              {profile.handle && (
                <span className="text-sm text-foreground/50">@{profile.handle}</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <div className="flex items-start gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.08em] text-foreground/40 font-medium">Bio</span>
              <DataSourceBadge fromBluesky={descriptionFromBluesky} />
            </div>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setEdit("description", e.target.value || null)}
                placeholder="Tell people about yourself..."
                rows={3}
                maxLength={2560}
                className={cn(
                  "w-full max-w-2xl text-sm md:text-base bg-transparent border-b-2 border-white/40",
                  "focus:border-primary/60 outline-none text-foreground/75 placeholder:text-foreground/40",
                  "leading-relaxed resize-none transition-colors",
                )}
              />
            ) : (
              description && (
                <p className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed">
                  {description}
                </p>
              )
            )}
          </div>

          {/* Pronouns + website row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pronouns */}
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <UserIcon className="h-3 w-3 text-foreground/40 shrink-0" />
                <input
                  type="text"
                  value={pronouns ?? ""}
                  onChange={(e) => setEdit("pronouns", e.target.value || null)}
                  placeholder="Pronouns"
                  maxLength={200}
                  className={cn(
                    "text-[10px] uppercase tracking-[0.08em] font-medium bg-transparent",
                    "border-b border-white/30 focus:border-primary/60 outline-none",
                    "text-foreground/60 placeholder:text-foreground/30 w-24 transition-colors",
                  )}
                />
              </div>
            ) : (
              pronouns && (
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  <UserIcon className="h-3 w-3 shrink-0" />
                  {pronouns}
                </span>
              )
            )}

            {/* Website */}
            {isEditing ? (
              <motion.button
                type="button"
                onClick={openWebsite}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] rounded-full px-2.5 py-1 font-medium border cursor-pointer transition-colors",
                  website
                    ? "text-foreground/60 bg-background/40 backdrop-blur-md border-border/50 hover:bg-background/60"
                    : "text-primary/70 bg-primary/5 border-primary/20 hover:bg-primary/10",
                )}
              >
                {website ? (
                  <>
                    <PencilIcon className="h-3 w-3 shrink-0 opacity-60" />
                    <GlobeIcon className="h-3 w-3 shrink-0" />
                    {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="h-3 w-3 shrink-0" />
                    Add website
                  </>
                )}
              </motion.button>
            ) : (
              website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-primary/80 hover:text-primary bg-background/40 backdrop-blur-md border border-primary/20 rounded-full px-2.5 py-1 font-medium transition-colors"
                >
                  <GlobeIcon className="h-3 w-3 shrink-0" />
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Top action row (z-10) ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-4">
        {/* Left: change banner button — only in edit mode */}
        <AnimatePresence>
          {isEditing && (
            <motion.button
              key="banner-btn"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={openBannerEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-background/70 transition-colors cursor-pointer"
              aria-label="Change banner image"
            >
              <ImageIcon className="h-3.5 w-3.5 text-foreground/80 shrink-0" />
              <span className="text-xs font-medium text-foreground/80">
                Change banner
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right: editing badge */}
        <div className="ml-auto">
          <AnimatePresence>
            {isEditing && (
              <motion.div
                key="editing-badge"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium uppercase tracking-[0.08em]"
              >
                <PencilIcon className="h-2.5 w-2.5" />
                Editing Profile
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ── ProfileEditBar ────────────────────────────────────────────────────────────

export function ProfileEditBar() {
  const [mode, setMode] = useUploadMode();
  const isEditing = mode === "edit";
  const isSaving = useProfileEditStore((s) => s.isSaving);
  const saveError = useProfileEditStore((s) => s.saveError);
  const hasChanges = useProfileEditStore((s) => s.hasChanges);
  const cancelEditing = useProfileEditStore((s) => s.cancelEditing);

  if (!isEditing) return null;

  const handleCancel = () => {
    cancelEditing();
    setMode(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isSaving ? (
          <span className="text-primary text-sm font-medium">Saving...</span>
        ) : saveError ? (
          <span className="text-destructive text-xs">{saveError}</span>
        ) : (
          <span>
            {hasChanges() ? "You have unsaved changes." : "No changes yet."}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <XIcon className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          form="profile-edit-save-form"
          type="submit"
          disabled={isSaving || !hasChanges()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          <SaveIcon className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </motion.div>
  );
}
