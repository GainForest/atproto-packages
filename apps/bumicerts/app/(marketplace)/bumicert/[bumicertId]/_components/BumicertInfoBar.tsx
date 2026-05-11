"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Share2Icon, CheckIcon, BuildingIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { BumicertData } from "@/lib/types";
import { links } from "@/lib/links";

function ShareButton() {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <motion.button
      onClick={handleShare}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm cursor-pointer hover:bg-muted/60 transition-colors shrink-0"
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
            <Share2Icon className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
            <span className="text-xs font-medium text-foreground/60">
              Share
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function BumicertMetaAvatar({ bumicert }: { bumicert: BumicertData }) {
  return (
    <Link href={links.account.byDid(bumicert.organizationDid)} className="shrink-0">
      <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-muted">
        {bumicert.logoUrl ? (
          <Image
            src={bumicert.logoUrl}
            alt={bumicert.organizationName}
            width={36}
            height={36}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </Link>
  );
}

function getCreatedAgo(createdAt: BumicertData["createdAt"]) {
  return createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : null;
}

/** Avatar + org name + time ago + share button */
export function BumicertCreationMeta({ bumicert }: { bumicert: BumicertData }) {
  const createdAgo = getCreatedAgo(bumicert.createdAt);

  return (
    <div className="flex items-center gap-3">
      <BumicertMetaAvatar bumicert={bumicert} />

      <Link
        href={links.account.byDid(bumicert.organizationDid)}
        className="group flex min-w-0 flex-col"
      >
        <span className="truncate text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
          {bumicert.organizationName}
        </span>
        {createdAgo ? (
          <span className="text-xs leading-tight text-muted-foreground">
            {createdAgo}
          </span>
        ) : null}
      </Link>

      <div className="ml-auto">
        <ShareButton />
      </div>
    </div>
  );
}

/** Avatar + bumicert title + time ago + share button */
export function BumicertTitleMeta({ bumicert }: { bumicert: BumicertData }) {
  const createdAgo = getCreatedAgo(bumicert.createdAt);

  return (
    <div className="flex items-center gap-3">
      <BumicertMetaAvatar bumicert={bumicert} />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium leading-tight text-foreground">
          {bumicert.title}
        </span>
        {createdAgo ? (
          <span className="text-xs leading-tight text-muted-foreground">
            {createdAgo}
          </span>
        ) : null}
      </div>

      <div className="ml-auto">
        <ShareButton />
      </div>
    </div>
  );
}

/** Objective chips only */
export function BumicertMeta({ bumicert }: { bumicert: BumicertData }) {
  if (bumicert.objectives.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {bumicert.objectives.map((obj) => (
        <span
          key={obj}
          className="text-sm text-foreground/60 bg-foreground/5 rounded-full px-2.5 py-0.5 font-medium"
        >
          {obj}
        </span>
      ))}
    </div>
  );
}
