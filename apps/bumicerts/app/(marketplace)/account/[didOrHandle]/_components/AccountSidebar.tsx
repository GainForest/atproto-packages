import Link from "next/link";
import type { ReactNode } from "react";
import {
  AwardIcon,
  BadgeCheckIcon,
  HandHeartIcon,
  LeafIcon,
  Share2Icon,
  SproutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BumicertIcon from "@/icons/BumicertIcon";
import { cn } from "@/lib/utils";
import type { AccountSidebarData } from "../server/account-sidebar";

type AccountContentColumnsProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

type AchievementIconName = AccountSidebarData["achievements"][number]["icon"];

type SidebarStat = AccountSidebarData["stats"][number];

const achievementIcons: Record<AchievementIconName, typeof BadgeCheckIcon> = {
  profile: BadgeCheckIcon,
  bumicert: SproutIcon,
  donation: HandHeartIcon,
};

export function AccountContentColumns({
  children,
  sidebar,
}: AccountContentColumnsProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">{children}</div>
      <aside className="py-6 lg:sticky lg:top-4 lg:w-80 lg:shrink-0 lg:self-start xl:w-[22rem]">
        {sidebar}
      </aside>
    </div>
  );
}

function SidebarCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-3xl border border-border bg-card/90 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function StatIcon({ stat }: { stat: SidebarStat }) {
  const className = "size-4 text-primary";

  if (stat.icon === "bumicert") {
    return <BumicertIcon className={className} />;
  }

  return <HandHeartIcon className={className} />;
}

function StatsCard({ stats }: { stats: AccountSidebarData["stats"] }) {
  return (
    <SidebarCard className="overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-border/70">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5">
            <div className="mb-3 flex size-9 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.08] shadow-inner">
              <StatIcon stat={stat} />
            </div>
            <p className="text-sm font-medium text-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function AchievementsCard({
  achievements,
  achievementsHref,
}: {
  achievements: AccountSidebarData["achievements"];
  achievementsHref: string;
}) {
  return (
    <SidebarCard id="account-achievements" className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <AwardIcon className="size-5 text-foreground/70" />
        <h2 className="text-lg font-semibold text-foreground">Achievements</h2>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement) => {
          const Icon = achievementIcons[achievement.icon];

          return (
            <div key={achievement.label} className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/10 shadow-inner">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {achievement.label}
                </p>
                <p className="text-sm leading-snug text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={achievementsHref}
        className="mt-6 block text-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        View all achievements
      </Link>
    </SidebarCard>
  );
}

function DecorativeLeafCluster() {
  const leafClass = "absolute rounded-full bg-primary/[0.12] shadow-sm";

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-40 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-10 bottom-0 size-40 rounded-full bg-primary/[0.08] blur-2xl" />
      <div className="absolute bottom-0 right-12 h-32 w-px -rotate-12 bg-primary/20" />
      <span className={cn(leafClass, "bottom-16 right-12 h-12 w-6 -rotate-45")} />
      <span className={cn(leafClass, "bottom-10 right-4 h-16 w-7 rotate-12")} />
      <span className={cn(leafClass, "bottom-24 right-2 h-11 w-5 rotate-45")} />
      <span className={cn(leafClass, "bottom-2 right-24 h-10 w-5 -rotate-12")} />
    </div>
  );
}

function InviteCard({ data }: { data: AccountSidebarData }) {
  return (
    <SidebarCard className="relative overflow-hidden p-5">
      <DecorativeLeafCluster />
      <div className="relative z-10 max-w-[13rem] space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <LeafIcon className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {data.inviteTitle}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {data.inviteDescription}
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="bg-background/70">
          <a href={data.inviteHref} target="_blank" rel="noopener noreferrer">
            <Share2Icon />
            {data.inviteActionLabel}
          </a>
        </Button>
      </div>
    </SidebarCard>
  );
}

export function AccountSidebar({ data }: { data: AccountSidebarData }) {
  return (
    <div className="space-y-5">
      <StatsCard stats={data.stats} />
      <AchievementsCard
        achievements={data.achievements}
        achievementsHref={data.achievementsHref}
      />
      <InviteCard data={data} />
    </div>
  );
}
