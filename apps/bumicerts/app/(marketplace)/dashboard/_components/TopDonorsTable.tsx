"use client";

import { useState } from "react";
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, UsersIcon } from "lucide-react";
import type { TopDonorRow } from "../_utils/aggregations";
import { UserChip } from "@/components/ui/user-chip";

interface TopDonorsTableProps {
  rows: TopDonorRow[];
}

type SortKey = "rank" | "totalAmount" | "donationCount" | "lastDonatedAt";
type SortDir = "asc" | "desc";

function formatWalletAddress(address: string): string {
  const truncated = address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
  return `Anonymous (${truncated})`;
}

interface SortIconProps {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}

function SortIcon({ col, sortKey, sortDir }: SortIconProps) {
  if (col !== sortKey) return <ChevronsUpDownIcon className="h-3 w-3 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUpIcon className="h-3 w-3" />
    : <ChevronDownIcon className="h-3 w-3" />;
}

interface ColProps {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  children: React.ReactNode;
}

function SortableCol({ col, sortKey, sortDir, onSort, children }: ColProps) {
  return (
    <th
      className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

export function TopDonorsTable({ rows }: TopDonorsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "rank") cmp = a.rank - b.rank;
    else if (sortKey === "totalAmount") cmp = a.totalAmount - b.totalAmount;
    else if (sortKey === "donationCount") cmp = a.donationCount - b.donationCount;
    else if (sortKey === "lastDonatedAt") {
      cmp = (a.lastDonatedAt ?? "").localeCompare(b.lastDonatedAt ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <UsersIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Top Donors
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">No donations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <SortableCol col="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  #
                </SortableCol>
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Donor
                </th>
                <SortableCol col="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Total Donated
                </SortableCol>
                <SortableCol col="donationCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Donations
                </SortableCol>
                <SortableCol col="lastDonatedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Last Donation
                </SortableCol>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.donorId}
                  className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                    {row.rank}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.donorType === "wallet" ? (
                      <span className="text-xs text-foreground" title={row.donorId}>
                        {formatWalletAddress(row.donorId)}
                      </span>
                    ) : (
                      <UserChip 
                        did={row.donorId}
                        avatarSize={18}
                        showCopyButton="hover"
                        linkMode="user-page"
                        className="border !border-transparent hover:!border-border"
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-foreground tabular-nums">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(row.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                    {row.donationCount}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">
                    {row.lastDonatedAt
                      ? new Date(row.lastDonatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
