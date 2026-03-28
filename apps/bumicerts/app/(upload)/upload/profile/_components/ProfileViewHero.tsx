"use client";

/**
 * ProfileViewHero — Read-only certified profile hero card.
 *
 * Shows the user's certified profile data with badges indicating
 * which fields come from Bluesky vs the certified profile.
 */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlobeIcon,
  Share2Icon,
  CheckIcon,
  PencilIcon,
  UserIcon,
} from "lucide-react";
import type { CertifiedProfileData } from "@/lib/types";
import { links } from "@/lib/links";
import { DataSourceBadge } from "./DataSourceBadge";

interface ProfileViewHeroProps {
  profile: CertifiedProfileData;
  showEditButton?: boolean;
}

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function ProfileViewHero({
  profile,
  showEditButton = false,
}: ProfileViewHeroProps) {
  const [copied, setCopied] = useState(false);

  const initial = profile.displayName?.charAt(0)?.toUpperCase() ?? "?";

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border">
      {/* ── Banner image ── */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {profile.bannerUrl ? (
            <Image
              src={profile.bannerUrl}
              alt={`${profile.displayName} banner`}
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

      {/* ── Top-right action buttons ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <motion.button
          onClick={handleShare}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/55 backdrop-blur-xl border border-white/20 shadow-lg cursor-pointer hover:bg-background/70 transition-colors"
          aria-label="Copy link"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">Copied!</span>
              </motion.span>
            ) : (
              <motion.span
                key="share"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Share2Icon className="h-3.5 w-3.5 text-foreground/80 shrink-0" />
                <span className="text-xs font-medium text-foreground/80">Share</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {showEditButton && (
          <Link
            href={links.upload.profileEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground border border-primary/20 shadow-lg transition-colors"
            aria-label="Edit profile"
          >
            <PencilIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Edit</span>
          </Link>
        )}
      </div>

      {/* ── Bottom content ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="max-w-3xl">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm shrink-0">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.displayName}
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

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground"
                  style={{ fontFamily: "var(--font-garamond-var)" }}
                >
                  {profile.displayName || profile.handle}
                </h1>
                <DataSourceBadge fromBluesky={profile.displayNameFromBluesky} />
              </div>
              {profile.handle && (
                <span className="text-sm text-foreground/50">@{profile.handle}</span>
              )}
            </div>
          </div>

          {/* Description */}
          {profile.description && (
            <div className="flex items-start gap-2 mb-3">
              <p className="text-sm md:text-base text-foreground/75 max-w-2xl leading-relaxed">
                {profile.description}
              </p>
              <DataSourceBadge fromBluesky={profile.descriptionFromBluesky} className="shrink-0 mt-0.5" />
            </div>
          )}

          {/* Pills row */}
          <div className="flex flex-wrap items-center gap-2">
            {profile.pronouns && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                <UserIcon className="h-3 w-3 shrink-0" />
                {profile.pronouns}
              </span>
            )}

            {profile.website && (
              <Link
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-primary/80 hover:text-primary bg-background/40 backdrop-blur-md border border-primary/20 rounded-full px-2.5 py-1 font-medium transition-colors"
              >
                <GlobeIcon className="h-3 w-3 shrink-0" />
                {formatWebsite(profile.website)}
              </Link>
            )}

            {profile.avatarFromBluesky && (
              <DataSourceBadge fromBluesky className="ml-1" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
