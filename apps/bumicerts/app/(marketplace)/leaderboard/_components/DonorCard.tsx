"use client";

import { motion } from "framer-motion";
import { HeartIcon, WalletIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";
import { UserChip } from "@/components/ui/user-chip";

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  // Medal for top 3
  if (rank <= 3) {
    const medals = ["", "🥇", "🥈", "🥉"];
    return (
      <span className="text-2xl" role="img" aria-label={`Rank ${rank}`}>
        {medals[rank]}
      </span>
    );
  }

  // Decorative number for others
  return (
    <span
      className="text-lg font-light text-muted-foreground/60 tabular-nums"
      style={{ fontFamily: "var(--font-garamond-var)" }}
    >
      {rank}
    </span>
  );
}

// ── Wallet address helper ─────────────────────────────────────────────────────

function formatWalletAddress(address: string): string {
  const truncated = address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
  return `Anonymous (${truncated})`;
}

// ── Main component ────────────────────────────────────────────────────────────

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/20 hover:shadow-lg transition-all duration-300"
    >
      {/* Rank */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Avatar/icon */}
      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        {isWallet ? (
          <WalletIcon className="h-4 w-4 text-primary/70" />
        ) : (
          <HeartIcon className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Donor info */}
      <div className="flex-1 min-w-0">
        {isWallet ? (
          <span className="text-sm font-medium text-foreground truncate">
            {formatWalletAddress(entry.donorId)}
          </span>
        ) : (
          <UserChip 
            did={entry.donorId}
            showCopyButton="hover"
            linkMode="user-page"
            className="border !border-transparent hover:!border-border"
          />
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.donationCount} donation{entry.donationCount !== 1 ? "s" : ""}
          {relativeTime && <span className="text-muted-foreground/60"> · last {relativeTime}</span>}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="text-base font-bold text-foreground">
          ${entry.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground">USD</div>
      </div>
    </motion.div>
  );
}
