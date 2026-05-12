"use client";

import { useMemo } from "react";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import { aggregateToLeaderboard } from "@/lib/utils/leaderboard";
import { useLeaderboardControls } from "../_hooks/useLeaderboardControls";
import { LeaderboardShell } from "./LeaderboardShell";
import { LeaderboardGrid } from "./LeaderboardGrid";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

export function LeaderboardClient() {
  const {
    period,
    setPeriod,
    donorFilter,
    setDonorFilter,
    sortBy,
    setSortBy,
  } = useLeaderboardControls();
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";

  const { data: receipts, isLoading } = indexerTrpc.funding.receipts.useQuery(
    { did: facilitatorDid },
    { enabled: !!facilitatorDid },
  );

  const leaderboard = useMemo(() => {
    if (!receipts) return null;
    return aggregateToLeaderboard(receipts, {
      period,
      limit: 100,
      donorFilter,
      sortBy,
    });
  }, [receipts, period, donorFilter, sortBy]);

  return (
    <LeaderboardShell
      animate={false}
      period={period}
      onPeriodChange={setPeriod}
      donorFilter={donorFilter}
      onDonorFilterChange={setDonorFilter}
      sortBy={sortBy}
      onSortChange={setSortBy}
      totalDonors={leaderboard?.totalDonorsCount ?? 0}
      totalRaised={leaderboard?.totalAmountSum ?? 0}
      totalProjectsSupported={leaderboard?.totalProjectsSupported ?? 0}
    >
      {isLoading ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardGrid entries={leaderboard?.entries ?? []} />
      )}
    </LeaderboardShell>
  );
}
