"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDownWideNarrowIcon,
  LeafIcon,
  SproutIcon,
  TrophyIcon,
  UserRoundCheckIcon,
  UserRoundXIcon,
  UsersRoundIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LeaderboardDonorFilter,
  LeaderboardSort,
  Period as LeaderboardPeriod,
} from "@/lib/utils/leaderboard";

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

const DONOR_FILTERS: {
  value: LeaderboardDonorFilter;
  label: string;
  Icon: typeof UsersRoundIcon;
}[] = [
  { value: "all", label: "All Donors", Icon: UsersRoundIcon },
  { value: "anonymous", label: "Anonymous Only", Icon: UserRoundXIcon },
  { value: "known", label: "Known Only", Icon: UserRoundCheckIcon },
];

const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "total-raised", label: "Total Raised" },
  { value: "donation-count", label: "Donation Count" },
  { value: "recent-donation", label: "Recent Donation" },
];

function PeriodChips({
  period,
  onPeriodChange,
}: {
  period: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-full bg-muted/55 p-1 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur">
      {PERIODS.map((option) => {
        const isSelected = period === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={!onPeriodChange}
            onClick={() => onPeriodChange?.(option.value)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DonorTypeTabs({
  donorFilter,
  onDonorFilterChange,
}: {
  donorFilter: LeaderboardDonorFilter;
  onDonorFilterChange?: (donorFilter: LeaderboardDonorFilter) => void;
}) {
  return (
    <div className="grid grid-cols-1 rounded-full bg-muted/55 p-1 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur sm:grid-cols-3">
      {DONOR_FILTERS.map(({ value, label, Icon }) => {
        const isSelected = donorFilter === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isSelected}
            disabled={!onDonorFilterChange}
            onClick={() => onDonorFilterChange?.(value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SortControl({
  sortBy,
  onSortChange,
}: {
  sortBy: LeaderboardSort;
  onSortChange?: (sortBy: LeaderboardSort) => void;
}) {
  const handleSortChange = (value: string) => {
    if (!onSortChange) return;

    switch (value) {
      case "total-raised":
        onSortChange("total-raised");
        break;
      case "donation-count":
        onSortChange("donation-count");
        break;
      case "recent-donation":
        onSortChange("recent-donation");
        break;
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-muted/55 py-1.5 pr-1.5 pl-4 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur">
      <span
        id="leaderboard-sort-label"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
      >
        <ArrowDownWideNarrowIcon className="size-4" />
        Sort by
      </span>
      <Select value={sortBy} onValueChange={handleSortChange} disabled={!onSortChange}>
        <SelectTrigger
          aria-labelledby="leaderboard-sort-label"
          className="h-9 min-w-[10.5rem] rounded-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-card/75 p-6 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/10">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="flex items-center gap-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "mt-1 text-3xl font-semibold tracking-[-0.02em] tabular-nums",
              accent ? "text-primary" : "text-foreground",
            )}
          >
            {value}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function HeroLandscapeArt() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] overflow-hidden">
      <Image
        src="/assets/media/images/leaderboard/hero-landscape-light.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 1152px, calc(100vw - 48px)"
        aria-hidden="true"
        className="object-cover object-center opacity-90 dark:hidden"
      />
      <Image
        src="/assets/media/images/leaderboard/hero-landscape-dark.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 1152px, calc(100vw - 48px)"
        aria-hidden="true"
        className="hidden object-cover object-center opacity-80 dark:block"
      />
      <div className="absolute inset-y-0 left-0 w-[54%] bg-gradient-to-r from-background via-background/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}

function StatsSummary({
  totalDonors,
  totalRaised,
  totalProjectsSupported,
}: {
  totalDonors: number;
  totalRaised: number;
  totalProjectsSupported: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <StatCard
        label="Total Raised"
        value={
          <>
            ${totalRaised.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}

          </>
        }
        detail="All time across the platform"
        icon={<LeafIcon className="size-8" />}
        accent
      />
      <StatCard
        label="Total Donors"
        value={totalDonors.toLocaleString("en-US")}
        detail="Generous impact champions"
        icon={<UsersRoundIcon className="size-8" />}
      />
      <StatCard
        label="Projects Supported"
        value={totalProjectsSupported.toLocaleString("en-US")}
        detail="Restoring ecosystems & livelihoods"
        icon={<SproutIcon className="size-8" />}
        accent
      />
    </div>
  );
}

export interface LeaderboardShellProps {
  animate?: boolean;
  period?: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
  donorFilter?: LeaderboardDonorFilter;
  onDonorFilterChange?: (donorFilter: LeaderboardDonorFilter) => void;
  sortBy?: LeaderboardSort;
  onSortChange?: (sortBy: LeaderboardSort) => void;
  totalDonors?: number;
  totalRaised?: number;
  totalProjectsSupported?: number;
  children?: React.ReactNode;
}

export function LeaderboardShell({
  animate = true,
  period = "all",
  onPeriodChange,
  donorFilter = "all",
  onDonorFilterChange,
  sortBy = "total-raised",
  onSortChange,
  totalDonors = 0,
  totalRaised = 0,
  totalProjectsSupported = 0,
  children,
}: LeaderboardShellProps) {
  return (
    <section className="relative -mt-14 overflow-hidden px-4 pb-20 pt-0 md:px-8 md:pb-28">
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent dark:from-primary/[0.12]" />
      <HeroLandscapeArt />

      <div className="relative mx-auto max-w-7xl">
        <motion.header
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10 max-w-4xl pt-[86px]"
        >
          <div className="mb-5 flex items-center gap-2.5">
            <TrophyIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Leaderboard
            </span>
          </div>
          <h1 className="max-w-4xl text-4xl font-light leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl font-garamond">
            Impact{" "}
            <span className="font-instrument italic text-foreground/85">Champions</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            Celebrating the generous contributors driving regenerative change for
            communities and the planet.
          </p>
        </motion.header>

        <motion.div
          initial={animate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-5 rounded-3xl bg-background/65 p-2 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur-xl"
        >
          <div className="grid gap-3 xl:grid-cols-[1fr_1.15fr_auto] xl:items-center">
            <PeriodChips period={period} onPeriodChange={onPeriodChange} />
            <DonorTypeTabs
              donorFilter={donorFilter}
              onDonorFilterChange={onDonorFilterChange}
            />
            <SortControl sortBy={sortBy} onSortChange={onSortChange} />
          </div>
        </motion.div>

        <motion.div
          initial={animate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-5"
        >
          <StatsSummary
            totalDonors={totalDonors}
            totalRaised={totalRaised}
            totalProjectsSupported={totalProjectsSupported}
          />
        </motion.div>

        {children}
      </div>
    </section>
  );
}
