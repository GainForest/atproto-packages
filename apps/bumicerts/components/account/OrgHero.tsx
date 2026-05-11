"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlobeIcon,
  CalendarIcon,
  Share2Icon,
  CheckIcon,
  PencilIcon,
} from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import { links } from "@/lib/links";
import { countries } from "@/lib/countries";
import { formatOrganizationSinceDate } from "@/lib/date";

interface OrgHeroProps {
  organization: OrganizationData;
  showEditButton?: boolean;
}

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function OrgHero({
  organization,
  showEditButton = false,
}: OrgHeroProps) {
  const [copied, setCopied] = useState(false);

  const initial = organization.displayName.charAt(0).toUpperCase();
  const sinceDate = formatOrganizationSinceDate(organization.startDate);
  const sinceLabel = sinceDate.label;
  const countryCode = organization.country;
  const allCountryCodes = Object.keys(countries);
  const country = countryCode
    ? allCountryCodes.includes(countryCode)
      ? countries[countryCode]
      : null
    : null;
  const hasPillRow =
    sinceDate.state === "valid" ||
    country ||
    organization.objectives.length > 0 ||
    organization.website;

  function handleShare() {
    const publicUrl = `${window.location.origin}${links.account.byDid(organization.did)}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-t-4xl border-t border-border">
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {organization.coverImageUrl ? (
            <Image
              src={organization.coverImageUrl}
              alt={`${organization.displayName} cover image`}
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
          <div className="absolute inset-0 bg-linear-to-b from-background/0 via-background/75 to-background" />
        </motion.div>
      </div>

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
            href={links.manage.edit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground border border-primary/20 shadow-lg transition-colors"
            aria-label="Edit profile"
          >
            <PencilIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium">Edit</span>
          </Link>
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-3 org-animate org-fade-in-up org-delay-1">
          <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted border border-white/15 shadow-sm shrink-0">
            {organization.logoUrl ? (
              <Image
                src={organization.logoUrl}
                alt={organization.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                {initial}
              </div>
            )}
          </div>
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-[-0.02em] leading-none text-foreground font-instrument italic">
              {organization.displayName}
            </h1>
            <p className="text-muted-foreground line-clamp-4 md:line-clamp-2 mt-1">
              {organization.shortDescription}
            </p>
          </div>
        </div>
        {hasPillRow && (
          <div className="mt-4 flex flex-wrap items-center gap-2 org-animate org-fade-in-up org-delay-3">
            {sinceLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                <CalendarIcon className="h-3 w-3 shrink-0" />
                Since {sinceLabel}
              </span>
            )}

            {country && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium">
                <span className="text-sm leading-none" aria-hidden="true">
                  {country.emoji}
                </span>
                {country.name}
              </span>
            )}

            {organization.objectives.map((obj) => (
              <span
                key={obj}
                className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-background/40 backdrop-blur-md border border-border/50 rounded-full px-2.5 py-1 font-medium"
              >
                {obj}
              </span>
            ))}

            {organization.website && (
              <Link
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-primary/80 hover:text-primary bg-background/40 backdrop-blur-md border border-primary/20 rounded-full px-2.5 py-1 font-medium transition-colors"
              >
                <GlobeIcon className="h-3 w-3 shrink-0" />
                {formatWebsite(organization.website)}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
