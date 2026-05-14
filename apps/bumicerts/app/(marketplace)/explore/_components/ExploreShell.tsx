"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { LeafIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { countryToRealm } from "@/lib/bioregions";
import { BumicertGrid } from "./BumicertGrid";
import { EMPTY_FILTERS, ExploreHeaderSlots, type Filters } from "./ExploreHeader";

const HERO_IMAGE_CLASS = "object-cover object-center";

function HeroBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <Image
        src="/images/explore/explore-hero-light.png"
        alt=""
        fill
        priority
        sizes="(min-width: 768px) calc(100vw - 15rem), 100vw"
        className={`${HERO_IMAGE_CLASS} dark:hidden`}
      />
      <Image
        src="/images/explore/explore-hero-dark.png"
        alt=""
        fill
        priority
        sizes="(min-width: 768px) calc(100vw - 15rem), 100vw"
        className={`${HERO_IMAGE_CLASS} hidden dark:block`}
      />
      <div className="absolute inset-0 bg-linear-to-r from-background/92 via-background/55 to-background/5 dark:from-background/78 dark:via-background/42 dark:to-background/0" />
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-b from-transparent via-background/70 to-background" />
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
    <section className="-mt-14 pb-20 md:pb-28">
      <div className="relative isolate overflow-hidden px-8 pb-24 pt-[86px] sm:px-10 md:pb-32 lg:px-9">
        <HeroBackdrop />
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 mx-auto max-w-6xl"
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

      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-6">
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
