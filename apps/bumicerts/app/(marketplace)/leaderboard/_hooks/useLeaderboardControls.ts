"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  LEADERBOARD_DONOR_FILTERS,
  LEADERBOARD_PERIODS,
  LEADERBOARD_SORTS,
  type LeaderboardDonorFilter,
  type LeaderboardSort,
  type Period as LeaderboardPeriod,
} from "@/lib/utils/leaderboard";

export function useLeaderboardControls() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(LEADERBOARD_PERIODS).withDefault("all").withOptions({
      shallow: true,
      history: "push",
    }),
  );
  const [donorFilter, setDonorFilter] = useQueryState(
    "donors",
    parseAsStringLiteral(LEADERBOARD_DONOR_FILTERS).withDefault("all").withOptions({
      shallow: true,
      history: "push",
    }),
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringLiteral(LEADERBOARD_SORTS).withDefault("total-raised").withOptions({
      shallow: true,
      history: "push",
    }),
  );

  const updatePeriod = (nextPeriod: LeaderboardPeriod) => {
    void setPeriod(nextPeriod);
  };

  const updateDonorFilter = (nextFilter: LeaderboardDonorFilter) => {
    void setDonorFilter(nextFilter);
  };

  const updateSortBy = (nextSort: LeaderboardSort) => {
    void setSortBy(nextSort);
  };

  return {
    period,
    setPeriod: updatePeriod,
    donorFilter,
    setDonorFilter: updateDonorFilter,
    sortBy,
    setSortBy: updateSortBy,
  };
}
