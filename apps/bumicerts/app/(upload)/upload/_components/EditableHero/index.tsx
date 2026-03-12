"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarIcon, GlobeIcon, PencilIcon, SaveIcon, XIcon } from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { ImageEditorModal } from "../../_modals/ImageEditorModal";
import { useUploadDashboardStore } from "../store";
import type { OrganizationData } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatSinceDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 0x41;
  return (
    String.fromCodePoint(code.toUpperCase().charCodeAt(0) + base) +
    String.fromCodePoint(code.toUpperCase().charCodeAt(1) + base)
  );
}

// ── EditableHero ──────────────────────────────────────────────────────────────

interface EditableHeroProps {
  organization: OrganizationData;
}

export function EditableHero({ organization }: EditableHeroProps) {
  const { pushModal, show } = useModal();
  const isEditing = useUploadDashboardStore((s) => s.isEditing);
  const edits = useUploadDashboardStore((s) => s.edits);
  const setEdit = useUploadDashboardStore((s) => s.setEdit);

  // Resolved display values (edit buffer takes priority over server data)
  const displayName = edits.displayName ?? organization.displayName;
  const shortDescription = edits.shortDescription ?? organization.shortDescription;
  const country = edits.country ?? organization.country;
  const website = edits.website ?? organization.website;
  const startDate = edits.startDate ?? organization.startDate;

  // Cover image: use object URL if a new file was selected, else server URL
  const coverImageUrl = edits.coverImage
    ? URL.createObjectURL(edits.coverImage)
    : organization.coverImageUrl;

  // Logo: same
  const logoUrl = edits.logo
    ? URL.createObjectURL(edits.logo)
    : organization.logoUrl;

  const initial = displayName.charAt(0).toUpperCase();
  const sinceLabel = formatSinceDate(startDate);
  const countryFlag = country ? countryCodeToFlag(country) : "";

  // ── Image edit actions ──────────────────────────────────────────────────────

  const openCoverEditor = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="cover"
            onConfirm={(file) => setEdit("coverImage", file)}
          />
        ),
      },
      true
    );
    show();
  };

  const openLogoEditor = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_IMAGE_EDITOR,
        content: (
          <ImageEditorModal
            target="logo"
            onConfirm={(file) => setEdit("logo", file)}
          />
        ),
      },
      true
    );
    show();
  };

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* Cover image */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={`${displayName} cover image`}
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
                  "radial-gradient(circle at 30% 50%, oklch(0.5 0.07 157 / 0.08) 0%, transparent 60%), radial-gradient(circle at 75% 25%, oklch(0.5 0.07 157 / 0.05) 0%, transparent 50%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-black/25 via-black/5 to-background" />
        </motion.div>

        {/* Cover edit button — only in edit mode */}
        {isEditing && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={openCoverEditor}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer group"
            aria-label="Change cover image"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/70 backdrop-blur-md border border-white/20 text-sm font-medium">
              <PencilIcon className="h-3.5 w-3.5" />
              Change cover
            </div>
          </motion.button>
        )}
      </div>

      {/* Bottom content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="max-w-3xl">
          {/* Logo + name row */}
          <div className="flex items-center gap-3 mb-3">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {initial}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={openLogoEditor}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm hover:bg-muted/60 transition-colors cursor-pointer"
                  aria-label="Change logo"
                >
                  <PencilIcon className="h-2.5 w-2.5" />
                </button>
              )}
            </div>

            {/* Display name — editable input in edit mode */}
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setEdit("displayName", e.target.value || null)}
                placeholder="Organisation name"
                className={cn(
                  "text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none",
                  "bg-transparent border-b-2 border-white/40 focus:border-primary/60 outline-none",
                  "text-foreground placeholder:text-foreground/40 w-full max-w-lg transition-colors"
                )}
                style={{ fontFamily: "var(--font-garamond-var)" }}
              />
            ) : (
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                {displayName}
              </h1>
            )}
          </div>

          {/* Short description */}
          {isEditing ? (
            <input
              type="text"
              value={shortDescription}
              onChange={(e) =>
                setEdit("shortDescription", e.target.value || null)
              }
              placeholder="Short description…"
              className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed bg-transparent border-b border-white/20 focus:border-primary/40 outline-none w-full placeholder:text-foreground/30 transition-colors"
            />
          ) : (
            shortDescription && (
              <p className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed">
                {shortDescription}
              </p>
            )
          )}

          {/* Pills row */}
          {(sinceLabel ?? country ?? website) && !isEditing && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {sinceLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  Since {sinceLabel}
                </span>
              )}
              {country && (
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  {countryFlag && (
                    <span className="text-sm leading-none" aria-hidden="true">
                      {countryFlag}
                    </span>
                  )}
                  {country}
                </span>
              )}
              {website && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                  <GlobeIcon className="h-3 w-3 shrink-0" />
                  {formatWebsite(website)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit mode indicator badge */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-medium uppercase tracking-[0.08em]"
        >
          <PencilIcon className="h-2.5 w-2.5" />
          Editing
        </motion.div>
      )}
    </section>
  );
}

// ── EditBar — save/cancel row shown below hero in edit mode ──────────────────

export function EditBar() {
  const isEditing = useUploadDashboardStore((s) => s.isEditing);
  const isSaving = useUploadDashboardStore((s) => s.isSaving);
  const saveError = useUploadDashboardStore((s) => s.saveError);
  const hasChanges = useUploadDashboardStore((s) => s.hasChanges);
  const cancelEditing = useUploadDashboardStore((s) => s.cancelEditing);

  if (!isEditing) return null;

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
          <span className="text-primary text-sm font-medium">Saving…</span>
        ) : saveError ? (
          <span className="text-destructive text-xs">{saveError}</span>
        ) : (
          <span>{hasChanges() ? "You have unsaved changes." : "No changes yet."}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={cancelEditing}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <XIcon className="h-3.5 w-3.5" />
          Cancel
        </button>
        {/* Save button lives in UploadDashboardClient to access mutation */}
        <button
          form="upload-dashboard-save-form"
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
