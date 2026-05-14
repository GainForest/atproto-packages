"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon, CrownIcon, LeafIcon, SparklesIcon, UserRoundCheckIcon, WalletIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";
import { UserChip } from "@/components/ui/user-chip";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const medals = ["", "🥇", "🥈", "🥉"];
    return (
      <span
        className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-primary/10 to-background text-2xl shadow-sm"
        role="img"
        aria-label={`Rank ${rank}`}
      >
        {medals[rank]}
      </span>
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-card text-base font-medium tabular-nums text-muted-foreground shadow-sm">
      {rank}
    </span>
  );
}

function formatWalletAddress(address: string): string {
  const truncated =
    address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
  return `Anonymous (${truncated})`;
}

function donationSummary(entry: LeaderboardEntry, relativeTime: string | null): string {
  const count = `${entry.donationCount} donation${entry.donationCount === 1 ? "" : "s"}`;
  return relativeTime ? `${count} · Last donation ${relativeTime}` : count;
}

function DonorBadges({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <CrownIcon className="size-3.5" />
          Top Donor
        </span>
        <span className="hidden items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
          <LeafIcon className="size-3.5" />
          Nature Champion
        </span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          Consistent Giver
        </span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          Rising Supporter
        </span>
      </div>
    );
  }

  return null;
}

interface DonorCardProps {
  entry: LeaderboardEntry;
  index: number;
}

export function DonorCard({ entry, index }: DonorCardProps) {
  const relativeTime = entry.lastDonatedAt
    ? (() => {
        try {
          return formatDistanceToNow(new Date(entry.lastDonatedAt), { addSuffix: true });
        } catch {
          return null;
        }
      })()
    : null;

  const isWallet = entry.donorType === "wallet";
  const actionHref = isWallet
    ? links.external.basescanAddress(entry.donorId)
    : links.account.byDid(entry.donorId);
  const actionLabel = isWallet
    ? `Open ${formatWalletAddress(entry.donorId)} on BaseScan`
    : "Open donor account in a new tab";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.3,
        delay: Math.min(index, 12) * 0.025,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="group grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-3xl bg-card/70 p-4 shadow-sm shadow-primary/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 sm:gap-5 sm:p-5"
    >
      <div className="flex items-center justify-center">
        <RankBadge rank={entry.rank} />
      </div>

      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground",
          !isWallet && "bg-primary/10 text-primary ring-primary/10",
        )}
      >
        {isWallet ? <WalletIcon className="size-5" /> : <UserRoundCheckIcon className="size-5" />}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {isWallet ? (
            <span className="truncate text-sm font-semibold text-foreground sm:text-base" title={entry.donorId}>
              {formatWalletAddress(entry.donorId)}
            </span>
          ) : (
            <UserChip
              did={entry.donorId}
              avatarSize={24}
              showCopyButton="hover"
              linkMode="none"
              className="min-w-0 max-w-full border !border-transparent hover:!border-border"
              textClassName="text-sm sm:text-base font-semibold text-foreground"
            />
          )}
          <DonorBadges rank={entry.rank} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
          {donationSummary(entry, relativeTime)}
        </p>
      </div>

      <div className="text-right">
        <div className="whitespace-nowrap text-base font-bold tabular-nums text-primary sm:text-lg">
          ${entry.totalAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      <a
        href={actionHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={actionLabel}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRightIcon className="size-5" aria-hidden="true" />
      </a>
    </motion.div>
  );
}
