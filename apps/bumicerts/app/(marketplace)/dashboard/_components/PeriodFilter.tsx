"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

const PERIODS = ["all", "month", "week"] as const;
type DashboardPeriod = (typeof PERIODS)[number];

interface PeriodFilterProps {
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
}

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  const t = useTranslations("marketplace.dashboard.periods");

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
      {PERIODS.map((p) => {
        const active = period === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPeriodChange(p)}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t(p)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hook to read/write the dashboard period from the URL search params.
 */
export function useDashboardPeriod() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(PERIODS).withDefault("all"),
  );

  return { period, setPeriod };
}
