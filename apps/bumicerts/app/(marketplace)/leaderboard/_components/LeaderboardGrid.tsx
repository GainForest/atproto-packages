"use client";

import { TrophyIcon } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";
import { DonorCard } from "./DonorCard";

interface LeaderboardGridProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardGrid({ entries }: LeaderboardGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card/70 py-16 text-center text-muted-foreground shadow-sm shadow-primary/5 backdrop-blur">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TrophyIcon className="size-8 opacity-60" />
        </div>
        <p className="text-3xl font-light text-foreground font-garamond">
          No donations yet
        </p>
        <p className="max-w-sm text-base italic text-foreground/70 font-instrument">
          Be the first to make an impact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry, index) => (
        <DonorCard key={entry.donorId} entry={entry} index={index} />
      ))}
    </div>
  );
}
