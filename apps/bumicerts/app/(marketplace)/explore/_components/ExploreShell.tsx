"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { LeafIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { countryToRealm } from "@/lib/bioregions";
import { cn } from "@/lib/utils";
import { BumicertGrid } from "./BumicertGrid";
import { EMPTY_FILTERS, ExploreHeaderSlots, type Filters } from "./ExploreHeader";

function Bird({ className }: { className?: string }) {
  return (
    <span className={cn("absolute block h-4 w-10", className)} aria-hidden>
      <span className="absolute left-0 top-2 h-3 w-5 rounded-t-full border-t-2 border-primary/45 rotate-12" />
      <span className="absolute right-0 top-2 h-3 w-5 rounded-t-full border-t-2 border-primary/45 -rotate-12" />
    </span>
  );
}

function LeafCluster() {
  const leafClass =
    "absolute border border-primary/20 bg-primary/20 shadow-[inset_10px_0_24px_color-mix(in_oklab,var(--foreground)_8%,transparent)]";

  return (
    <div
      className="pointer-events-none absolute -right-8 top-6 hidden h-80 w-80 opacity-80 md:block dark:opacity-45"
      aria-hidden
    >
      <span className="absolute bottom-0 left-36 h-72 w-px origin-bottom -rotate-12 bg-primary/20" />
      <span
        className={cn(leafClass, "right-2 top-2 h-36 w-20 rotate-[22deg]")}
        style={{ borderRadius: "72% 8% 72% 8%" }}
      />
      <span
        className={cn(leafClass, "right-28 top-20 h-32 w-24 rotate-[112deg]")}
        style={{ borderRadius: "72% 8% 72% 8%" }}
      />
      <span
        className={cn(leafClass, "right-6 top-36 h-40 w-24 rotate-[42deg]")}
        style={{ borderRadius: "72% 8% 72% 8%" }}
      />
      <span
        className={cn(leafClass, "right-40 top-48 h-28 w-20 rotate-[126deg]")}
        style={{ borderRadius: "72% 8% 72% 8%" }}
      />
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      aria-hidden
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--accent) 44%, var(--background)) 0%, color-mix(in oklab, var(--background) 88%, var(--primary)) 56%, var(--background) 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-80 dark:opacity-45"
        style={{
          background:
            "radial-gradient(circle at 76% 23%, color-mix(in oklab, var(--card) 88%, transparent) 0 4.5rem, transparent 4.7rem), radial-gradient(circle at 47% 2%, color-mix(in oklab, var(--card) 78%, transparent) 0 10rem, transparent 17rem), radial-gradient(circle at 24% 40%, color-mix(in oklab, var(--primary) 13%, transparent) 0 16rem, transparent 28rem)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 h-[74%] opacity-70 dark:opacity-50">
        <div
          className="absolute bottom-4 left-[40%] h-[78%] w-[44rem] -translate-x-1/2 blur-[1px] [clip-path:polygon(0_100%,12%_67%,22%_78%,36%_36%,48%_68%,62%_42%,76%_71%,100%_100%)]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 13%, transparent), color-mix(in oklab, var(--primary) 20%, transparent) 58%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-[56%] h-[66%] w-[54rem] -translate-x-1/2 blur-[2px] [clip-path:polygon(0_100%,16%_76%,28%_58%,42%_70%,56%_34%,70%_66%,83%_52%,100%_100%)]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 9%, transparent), color-mix(in oklab, var(--primary) 17%, transparent) 62%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-[33%] h-[34%] w-[52rem] -translate-x-1/2 blur-[3px] [clip-path:polygon(0_100%,13%_73%,30%_62%,46%_82%,59%_54%,76%_76%,100%_100%)]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--primary) 26%, transparent), color-mix(in oklab, var(--primary) 11%, transparent) 72%, transparent 100%)",
          }}
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 72%, transparent) 58%, var(--background) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-36"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 70%, transparent), transparent)",
        }}
      />
      <Bird className="right-[22%] top-24 scale-75" />
      <Bird className="right-[13%] top-16 scale-50 opacity-75" />
      <Bird className="right-[30%] top-32 scale-90 opacity-70" />
      <LeafCluster />
    </div>
  );
}

export function ExploreShell({
  bumicerts,
  animate = true,
  children,
}: {
  bumicerts: BumicertData[];
  animate?: boolean;
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const toggleFilter = useCallback((category: keyof Filters, value: string) => {
    setFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  }, []);

  const activeFilterCount =
    filters.organizations.length +
    filters.countries.length +
    filters.bioregions.length +
    filters.objectives.length;

  const filtered = useMemo(() => {
    let result = [...bumicerts];
    if (filters.organizations.length > 0) {
      result = result.filter((b) =>
        filters.organizations.includes(b.organizationDid),
      );
    }
    if (filters.bioregions.length > 0) {
      result = result.filter((b) => {
        const realmId = countryToRealm[b.country];
        return realmId ? filters.bioregions.includes(realmId) : false;
      });
    }
    if (filters.countries.length > 0) {
      result = result.filter((b) => filters.countries.includes(b.country));
    }
    if (filters.objectives.length > 0) {
      result = result.filter((b) =>
        b.objectives.some((o) => filters.objectives.includes(o)),
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.organizationName.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q) ||
          b.objectives.some((o) => o.toLowerCase().includes(q)),
      );
    }
    result.sort((a, b) =>
      sort === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return result;
  }, [bumicerts, query, sort, filters]);

  return (
    <section className="pb-20 md:pb-28">
      <div className="relative isolate px-6 pt-9 pb-24 md:pt-12 md:pb-32">
        <HeroBackdrop />
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 mx-auto max-w-[96rem]"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <LeafIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Explore Projects
            </span>
          </div>
          <h1
            className="max-w-4xl text-4xl font-light leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Discover{" "}
            <span
              className="whitespace-nowrap text-foreground/85"
              style={{
                fontFamily: "var(--font-instrument-serif-var)",
                fontStyle: "italic",
              }}
            >
              Regenerative Impact
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            Browse projects from communities and organizations restoring
            ecosystems, strengthening livelihoods, and building a more resilient
            future.
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-[96rem] px-6">
        <ExploreHeaderSlots
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          filters={filters}
          setFilters={setFilters}
          toggleFilter={toggleFilter}
          activeFilterCount={activeFilterCount}
          bumicerts={bumicerts}
          shouldAnimate={animate}
        />

        {!children ? (
          <p className="mt-8 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{filtered.length}</span>{" "}
            projects found
          </p>
        ) : null}

        <div className="mt-5">
          {children ?? <BumicertGrid bumicerts={filtered} />}
        </div>
      </div>
    </section>
  );
}
