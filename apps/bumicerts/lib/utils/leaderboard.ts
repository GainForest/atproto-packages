/**
 * Leaderboard aggregation utilities.
 *
 * These helpers aggregate raw funding receipts into a ranked leaderboard.
 * They run client-side after fetching receipts via trpc.funding.receipts.
 */

import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";
import { extractDonor as extractDonorFromReceipt } from "./extract-donor";

const USD_CURRENCIES: ReadonlyArray<string> = ["USD", "USDC"];

export const LEADERBOARD_PERIODS = ["all", "month", "week"] as const;
export const LEADERBOARD_DONOR_FILTERS = ["all", "anonymous", "known"] as const;
export const LEADERBOARD_SORTS = ["total-raised", "donation-count", "recent-donation"] as const;

export type Period = (typeof LEADERBOARD_PERIODS)[number];
export type LeaderboardDonorFilter = (typeof LEADERBOARD_DONOR_FILTERS)[number];
export type LeaderboardSort = (typeof LEADERBOARD_SORTS)[number];

export interface LeaderboardEntry {
  rank: number;
  donorId: string;
  donorType: "did" | "wallet";
  totalAmount: number;
  donationCount: number;
  lastDonatedAt: string | null;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  totalDonorsCount: number;
  totalAmountSum: number;
  totalProjectsSupported: number;
}

export interface LeaderboardOptions {
  period?: Period;
  limit?: number;
  donorFilter?: LeaderboardDonorFilter;
  sortBy?: LeaderboardSort;
}

function extractDonor(item: FundingReceiptItem): { id: string; type: "did" | "wallet" } | null {
  return extractDonorFromReceipt(item.record?.from);
}

function filterByPeriod(receipts: FundingReceiptItem[], period: Period): FundingReceiptItem[] {
  if (period === "all") return receipts;

  const now = new Date();
  const cutoff =
    period === "week"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return receipts.filter((receipt) => {
    const dateStr = receipt.record?.occurredAt ?? receipt.record?.createdAt;
    if (!dateStr) return false;
    return new Date(dateStr) >= cutoff;
  });
}

function donorMatchesFilter(
  donorType: "did" | "wallet",
  donorFilter: LeaderboardDonorFilter,
): boolean {
  switch (donorFilter) {
    case "all":
      return true;
    case "anonymous":
      return donorType === "wallet";
    case "known":
      return donorType === "did";
  }
}

function dateTimeValue(date: string | null): number {
  if (!date) return 0;
  const time = Date.parse(date);
  return Number.isNaN(time) ? 0 : time;
}

function compareEntries(
  a: Omit<LeaderboardEntry, "rank">,
  b: Omit<LeaderboardEntry, "rank">,
  sortBy: LeaderboardSort,
): number {
  switch (sortBy) {
    case "total-raised": {
      const amountDiff = b.totalAmount - a.totalAmount;
      if (amountDiff !== 0) return amountDiff;
      return b.donationCount - a.donationCount;
    }
    case "donation-count": {
      const countDiff = b.donationCount - a.donationCount;
      if (countDiff !== 0) return countDiff;
      return b.totalAmount - a.totalAmount;
    }
    case "recent-donation": {
      const dateDiff = dateTimeValue(b.lastDonatedAt) - dateTimeValue(a.lastDonatedAt);
      if (dateDiff !== 0) return dateDiff;
      return b.totalAmount - a.totalAmount;
    }
  }
}

export function aggregateToLeaderboard(
  receipts: FundingReceiptItem[],
  options: LeaderboardOptions = {},
): LeaderboardResult {
  const {
    period = "all",
    limit = 100,
    donorFilter = "all",
    sortBy = "total-raised",
  } = options;

  const filtered = filterByPeriod(receipts, period);

  const usdOnly = filtered.filter((receipt) => {
    const currency = receipt.record?.currency?.toUpperCase();
    return currency ? USD_CURRENCIES.includes(currency) : false;
  });

  const donorMap = new Map<
    string,
    {
      type: "did" | "wallet";
      totalAmount: number;
      donationCount: number;
      lastDonatedAt: string | null;
    }
  >();
  const projectUris = new Set<string>();

  for (const receipt of usdOnly) {
    const donor = extractDonor(receipt);
    if (!donor || !donorMatchesFilter(donor.type, donorFilter)) continue;

    const amount = Number.parseFloat(receipt.record?.amount ?? "0");
    const dateStr = receipt.record?.occurredAt ?? receipt.record?.createdAt ?? null;
    const projectUri = receipt.record?.for?.uri;
    if (projectUri) projectUris.add(projectUri);

    const existing = donorMap.get(donor.id);
    if (existing) {
      existing.totalAmount += amount;
      existing.donationCount += 1;
      if (dateStr && (!existing.lastDonatedAt || dateStr > existing.lastDonatedAt)) {
        existing.lastDonatedAt = dateStr;
      }
    } else {
      donorMap.set(donor.id, {
        type: donor.type,
        totalAmount: amount,
        donationCount: 1,
        lastDonatedAt: dateStr,
      });
    }
  }

  const sorted = Array.from(donorMap.entries())
    .map(([donorId, data]) => ({
      donorId,
      donorType: data.type,
      totalAmount: data.totalAmount,
      donationCount: data.donationCount,
      lastDonatedAt: data.lastDonatedAt,
    }))
    .sort((a, b) => compareEntries(a, b, sortBy) || a.donorId.localeCompare(b.donorId));

  const entries: LeaderboardEntry[] = sorted.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  const totalAmountSum = Array.from(donorMap.values()).reduce(
    (sum, data) => sum + data.totalAmount,
    0,
  );

  return {
    entries,
    totalDonorsCount: donorMap.size,
    totalAmountSum,
    totalProjectsSupported: projectUris.size,
  };
}
