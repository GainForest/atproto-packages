import { DollarSignIcon, HashIcon, UsersIcon, TrendingUpIcon, LayoutGridIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DashboardKPIs } from "../_utils/aggregations";

interface KPISummaryProps {
  kpis: DashboardKPIs;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p
        className="text-3xl md:text-4xl font-light tracking-[-0.02em] leading-none text-foreground"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function formatUSD(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function KPISummary({ kpis }: KPISummaryProps) {
  const t = useTranslations("marketplace.dashboard.kpis");
  const locale = useLocale();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        icon={<DollarSignIcon className="h-4 w-4" />}
        label={t("totalRaised")}
        value={formatUSD(kpis.totalRaised, locale)}
        sub={t("totalRaisedSub")}
      />
      <StatCard
        icon={<HashIcon className="h-4 w-4" />}
        label={t("totalDonations")}
        value={formatCount(kpis.totalDonations, locale)}
        sub={t("totalDonationsSub")}
      />
      <StatCard
        icon={<UsersIcon className="h-4 w-4" />}
        label={t("uniqueDonors")}
        value={formatCount(kpis.uniqueDonors, locale)}
        sub={t("uniqueDonorsSub")}
      />
      <StatCard
        icon={<TrendingUpIcon className="h-4 w-4" />}
        label={t("avgDonation")}
        value={formatUSD(kpis.avgDonation, locale)}
        sub={t("avgDonationSub")}
      />
      <StatCard
        icon={<LayoutGridIcon className="h-4 w-4" />}
        label={t("activeBumicerts")}
        value={formatCount(kpis.activeBumicerts, locale)}
        sub={t("activeBumicertsSub")}
      />
    </div>
  );
}
