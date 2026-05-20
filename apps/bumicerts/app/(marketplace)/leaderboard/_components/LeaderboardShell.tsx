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
import { useLocale, useTranslations } from "next-intl";
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

const PERIODS: LeaderboardPeriod[] = ["all", "month", "week"];

const DONOR_FILTERS: {
  value: LeaderboardDonorFilter;
  Icon: typeof UsersRoundIcon;
}[] = [
  { value: "all", Icon: UsersRoundIcon },
  { value: "anonymous", Icon: UserRoundXIcon },
  { value: "known", Icon: UserRoundCheckIcon },
];

const SORT_OPTIONS: LeaderboardSort[] = ["total-raised", "donation-count", "recent-donation"];

function PeriodChips({
  period,
  onPeriodChange,
}: {
  period: LeaderboardPeriod;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
}) {
  const t = useTranslations("marketplace.leaderboard.periods");

  return (
    <div className="grid grid-cols-3 rounded-full bg-muted/55 p-1 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur">
      {PERIODS.map((option) => {
        const isSelected = period === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={!onPeriodChange}
            onClick={() => onPeriodChange?.(option)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {t(option)}
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
  const t = useTranslations("marketplace.leaderboard.donorFilters");

  return (
    <div className="grid grid-cols-1 rounded-full bg-muted/55 p-1 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur sm:grid-cols-3">
      {DONOR_FILTERS.map(({ value, Icon }) => {
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
            {t(value)}
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
  const t = useTranslations("marketplace.leaderboard.sort");
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
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground"
      >
        <ArrowDownWideNarrowIcon className="size-4" />
        {t("label")}
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
            <SelectItem key={option} value={option}>
              {t(option === "total-raised" ? "totalRaised" : option === "donation-count" ? "donationCount" : "recentDonation")}
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
    <div className="group relative overflow-hidden rounded-3xl bg-foreground/5 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/[0.07]">
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
  const t = useTranslations("marketplace.leaderboard.stats");
  const locale = useLocale();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <StatCard
        label={t("totalRaised")}
        value={new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(totalRaised)}
        detail={t("totalRaisedDetail")}
        icon={<LeafIcon className="size-8" />}
        accent
      />
      <StatCard
        label={t("totalDonors")}
        value={totalDonors.toLocaleString(locale)}
        detail={t("totalDonorsDetail")}
        icon={<UsersRoundIcon className="size-8" />}
      />
      <StatCard
        label={t("projectsSupported")}
        value={totalProjectsSupported.toLocaleString(locale)}
        detail={t("projectsSupportedDetail")}
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
  const t = useTranslations("marketplace.leaderboard.hero");

  return (
    <section className="relative -mt-14 overflow-hidden pb-20 pt-0 md:pb-28">
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/[0.08] via-transparent to-transparent dark:from-primary/[0.12]" />
      <HeroLandscapeArt />

      <div className="relative min-h-[330px]">
        <motion.header
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mb-0 flex max-w-6xl flex-col px-8 pb-14 pt-[86px] sm:px-10 lg:px-9"
        >
          <div className="mb-5 flex items-center gap-2.5">
            <TrophyIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {t("eyebrow")}
            </span>
          </div>
          <h1 className="max-w-4xl text-4xl font-light leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl font-garamond">
            {t("titlePrefix")} {" "}
            <span className="font-instrument italic text-foreground/85">{t("titleEmphasis")}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            {t("description")}
          </p>
        </motion.header>

      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="relative z-20 -mt-6 space-y-3 mb-0 px-3">
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
      </div>
    </section>
  );
}
