"use client";

import { TrophyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";
import { DonorCard } from "./DonorCard";

interface LeaderboardGridProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardGrid({ entries }: LeaderboardGridProps) {
  const t = useTranslations("marketplace.leaderboard.empty");

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card/75 py-16 text-center text-muted-foreground shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TrophyIcon className="size-8 opacity-60" />
        </div>
        <p className="text-3xl font-light text-foreground font-garamond">
          {t("title")}
        </p>
        <p className="max-w-sm text-base italic text-foreground/70 font-instrument">
          {t("description")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card/70 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur divide-y divide-border/60">
      {entries.map((entry, index) => (
        <DonorCard key={entry.donorId} entry={entry} index={index} />
      ))}
    </div>
  );
}
