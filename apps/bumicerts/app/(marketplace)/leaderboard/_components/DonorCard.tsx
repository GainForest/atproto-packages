"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon, CrownIcon, LeafIcon, SparklesIcon, UserRoundCheckIcon, WalletIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";
import { UserChip } from "@/components/ui/user-chip";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

function RankBadge({ rank }: { rank: number }) {
  const t = useTranslations("marketplace.leaderboard.card");
  if (rank <= 3) {
    const medals = ["", "🥇", "🥈", "🥉"];
    return (
      <span
        className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-primary/10 to-background text-2xl shadow-sm ring-1 ring-foreground/5"
        role="img"
        aria-label={t("rankAriaLabel", { rank })}
      >
        {medals[rank]}
      </span>
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-card text-base font-medium tabular-nums text-muted-foreground shadow-sm ring-1 ring-foreground/5">
      {rank}
    </span>
  );
}

function formatWalletAddress(address: string, anonymousLabel: (address: string) => string): string {
  const truncated =
    address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
  return anonymousLabel(truncated);
}

function donationSummary(
  entry: LeaderboardEntry,
  relativeTime: string | null,
  donationCountLabel: (count: number) => string,
  lastDonationLabel: (relativeTime: string) => string,
): string {
  const count = donationCountLabel(entry.donationCount);
  return relativeTime ? `${count} · ${lastDonationLabel(relativeTime)}` : count;
}

function formatRelativeTimeFromNow(date: Date, locale: string): string {
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffInSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (abs < 60) return formatter.format(diffInSeconds, "second");
  if (abs < 3600) return formatter.format(Math.round(diffInSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffInSeconds / 3600), "hour");
  if (abs < 2592000) return formatter.format(Math.round(diffInSeconds / 86400), "day");
  if (abs < 31536000) return formatter.format(Math.round(diffInSeconds / 2592000), "month");
  return formatter.format(Math.round(diffInSeconds / 31536000), "year");
}

function DonorBadges({ rank }: { rank: number }) {
  const t = useTranslations("marketplace.leaderboard.card");
  if (rank === 1) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <CrownIcon className="size-3.5" />
          {t("topDonor")}
        </span>
        <span className="hidden items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
          <LeafIcon className="size-3.5" />
          {t("natureChampion")}
        </span>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          {t("consistentGiver")}
        </span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          {t("risingSupporter")}
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
  const t = useTranslations("marketplace.leaderboard.card");
  const locale = useLocale();
  const anonymousLabel = (address: string) => t("anonymous", { address });
  const relativeTime = entry.lastDonatedAt
    ? (() => {
        try {
          return formatRelativeTimeFromNow(new Date(entry.lastDonatedAt), locale);
        } catch {
          return null;
        }
      })()
    : null;

  const isWallet = entry.donorType === "wallet";
  const actionHref = isWallet
    ? links.external.basescanAddress(entry.donorId)
    : links.account.byDid(entry.donorId);
  const walletLabel = formatWalletAddress(entry.donorId, anonymousLabel);
  const actionLabel = isWallet
    ? t("openWallet", { wallet: walletLabel })
    : t("openAccount");

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
      className="group grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-4 transition-colors duration-200 hover:bg-card/65 sm:gap-5 sm:px-5"
    >
      <div className="flex items-center justify-center">
        <RankBadge rank={entry.rank} />
      </div>

      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5",
          !isWallet && "bg-primary/10 text-primary ring-primary/10",
        )}
      >
        {isWallet ? <WalletIcon className="size-5" /> : <UserRoundCheckIcon className="size-5" />}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {isWallet ? (
            <span className="truncate text-sm font-semibold text-foreground sm:text-base" title={entry.donorId}>
              {walletLabel}
            </span>
          ) : (
            <UserChip
              did={entry.donorId}
              avatarSize={24}
              showCopyButton="hover"
              linkMode="user-page"
              className="min-w-0 max-w-full"
              textClassName="text-sm sm:text-base font-semibold text-foreground"
            />
          )}
          <DonorBadges rank={entry.rank} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
          {donationSummary(
            entry,
            relativeTime,
            (count) => t("donationSummary", { count }),
            (value) => t("lastDonation", { relativeTime: value }),
          )}
        </p>
      </div>

      <div className="text-right">
        <div className="whitespace-nowrap text-base font-bold tabular-nums text-primary sm:text-lg">
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(entry.totalAmount)}
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
