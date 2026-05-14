"use client";

import { useState, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  UsersIcon,
  SearchIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
} from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { OrganizationCard } from "./OrganizationCard";
import { countries } from "@/lib/countries";
import { realms, countryToRealm } from "@/lib/bioregions";

// ── Country chips (secondary dynamic) ─────────────────────────────────────────

function CountryChips({
  organizations,
  countryFilter,
  setCountryFilter,
}: {
  organizations: OrganizationData[];
  countryFilter: string | null;
  setCountryFilter: (c: string | null) => void;
}) {
  const chips = useMemo(() => {
    const codes = Array.from(
      new Set(organizations.map((o) => o.country).filter(Boolean)),
    );
    return codes
      .map((code) => ({
        code,
        emoji: countries[code]?.emoji ?? "",
        name: countries[code]?.name ?? code,
        isSelected: countryFilter === code,
      }))
      .sort((a, b) => Number(b.isSelected) - Number(a.isSelected));
  }, [organizations, countryFilter]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pb-1">
      {chips.map((c) => (
        <button
          key={c.code}
          onClick={() =>
            setCountryFilter(countryFilter === c.code ? null : c.code)
          }
          className={cn(
            "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
            c.isSelected
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground",
          )}
        >
          {c.emoji} {c.name}
        </button>
      ))}
    </div>
  );
}

function CountryChipsSkeleton() {
  return (
    <div className="flex items-center gap-2 pb-1">
      {[96, 80, 88, 100, 84].map((w, i) => (
        <Skeleton
          key={i}
          className="h-7 rounded-full shrink-0"
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

// ── Bioregion chips (derived from country → realm mapping) ──────────────────

function BioregionChips({
  organizations,
  bioregionFilter,
  setBioregionFilter,
}: {
  organizations: OrganizationData[];
  bioregionFilter: string | null;
  setBioregionFilter: (r: string | null) => void;
}) {
  const chips = useMemo(() => {
    // Collect unique realm IDs present in the org data
    const realmIds = new Set<string>();
    for (const org of organizations) {
      const realmId = countryToRealm[org.country];
      if (realmId) realmIds.add(realmId);
    }
    return Array.from(realmIds)
      .map((id) => ({
        id,
        emoji: realms[id]?.emoji ?? "",
        name: realms[id]?.name ?? id,
        isSelected: bioregionFilter === id,
      }))
      .sort(
        (a, b) =>
          Number(b.isSelected) - Number(a.isSelected) ||
          a.name.localeCompare(b.name),
      );
  }, [organizations, bioregionFilter]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pb-1">
      {chips.map((r) => (
        <button
          key={r.id}
          onClick={() =>
            setBioregionFilter(bioregionFilter === r.id ? null : r.id)
          }
          className={cn(
            "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
            r.isSelected
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground",
          )}
        >
          {r.emoji} {r.name}
        </button>
      ))}
    </div>
  );
}

// ── Sort options ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "bumicerts", label: "Most Bumicerts" },
  { value: "alpha", label: "Alphabetical" },
  { value: "newest", label: "Newest" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function LeafAccent() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-2 -top-3 flex h-5 w-5 -rotate-12 items-center justify-center"
    >
      <span className="absolute h-3.5 w-2 rotate-45 rounded-[100%_0_100%_0] bg-primary/85 shadow-sm shadow-primary/20" />
      <span className="absolute left-2.5 top-2 h-2.5 w-px rotate-45 bg-primary/70" />
    </span>
  );
}

function OrganizationsHero({ animate }: { animate: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative min-h-[330px] overflow-hidden bg-card"
    >
      <div className="absolute inset-0">
        <Image
          src="/assets/organizations/organizations-hero-light.png"
          alt="Misty mountain forest at sunrise"
          fill
          priority
          sizes="(min-width: 1280px) 1152px, calc(100vw - 48px)"
          className="object-cover object-center dark:hidden"
        />
        <Image
          src="/assets/organizations/organizations-hero-dark.png"
          alt="Misty mountain forest at dusk"
          fill
          priority
          sizes="(min-width: 1280px) 1152px, calc(100vw - 48px)"
          className="hidden object-cover object-center dark:block"
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_36%,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_28%),linear-gradient(90deg,color-mix(in_oklab,var(--background)_58%,transparent)_0%,color-mix(in_oklab,var(--background)_42%,transparent)_26%,transparent_58%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_46%,transparent)_0%,transparent_42%,var(--background)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/70 to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-8 pb-14 pt-[86px] sm:px-10 lg:px-9">
        <div className="mb-5 flex items-center gap-2.5">
          <UsersIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Organizations
          </span>
        </div>
        <h1
          aria-label="Nature Stewards"
          className="max-w-4xl text-4xl font-light leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          <span aria-hidden="true">
            Nature{" "}
            <span
              className="text-foreground/90"
              style={{
                fontFamily: "var(--font-instrument-serif-var)",
                fontStyle: "italic",
              }}
            >
              Stewa
              <span className="relative inline-block">
                r
                <LeafAccent />
              </span>
              ds
            </span>
          </span>
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
          Discover organizations leading environmental stewardship and
          community-driven change.
        </p>
      </div>
    </motion.div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

/**
 * AllOrgsShell — shared wrapper used by both loading.tsx and page.tsx.
 *
 * Renders all static chrome immediately:
 *   - heading (h1 — SEO-critical)
 *   - search input + sort dropdown
 *   - country filter chips (secondary dynamic — wrapped in Suspense)
 *
 * `organizations` drives both the chips and the grid. Fetched once in
 * page.tsx, passed as a prop — no duplicate fetches.
 *
 * `children` is the skeleton grid in loading.tsx.
 * When organizations has data (page.tsx), the real filtered grid is rendered.
 */
export function AllOrgsShell({
  organizations,
  animate = true,
  children,
}: {
  organizations: OrganizationData[];
  /** false in loading.tsx so chrome appears instantly; true (default) in page.tsx */
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("bumicerts");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [bioregionFilter, setBioregionFilter] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...organizations];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (o) =>
          o.displayName.toLowerCase().includes(q) ||
          o.shortDescription.toLowerCase().includes(q) ||
          o.objectives.some((obj) => obj.toLowerCase().includes(q)),
      );
    }
    if (countryFilter)
      result = result.filter((o) => o.country === countryFilter);
    if (bioregionFilter)
      result = result.filter(
        (o) => countryToRealm[o.country] === bioregionFilter,
      );
    switch (sort) {
      case "bumicerts":
        result.sort((a, b) => b.bumicertCount - a.bumicertCount);
        break;
      case "alpha":
        result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case "newest":
        result.sort((a, b) =>
          (b.startDate ?? "").localeCompare(a.startDate ?? ""),
        );
        break;
    }
    return result;
  }, [organizations, query, sort, countryFilter, bioregionFilter]);

  return (
    <section className="-mt-14 pb-20 md:pb-28">
      <OrganizationsHero animate={animate} />

      <div className="max-w-6xl mx-auto px-6">
        {/* Search + sort row */}
        <div className="relative z-20 -mt-6 space-y-3 mb-0 px-3">
          <div className="flex items-center gap-3">
            <InputGroup className="h-10 flex-1 rounded-full bg-background/50 backdrop-blur">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations..."
              />
            </InputGroup>

            <div className="relative shrink-0">
              <Button
                onClick={() =>
                  setOpenDropdown((p) => (p === "sort" ? null : "sort"))
                }
                type="button"
                variant="secondary"
                size="lg"
              >
                <ArrowUpDownIcon />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "transition-transform",
                    openDropdown === "sort" && "rotate-180",
                  )}
                />
              </Button>
              <AnimatePresence>
                {openDropdown === "sort" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-background border border-border rounded-2xl shadow-xl z-20 py-1.5"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSort(option.value);
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors",
                          sort === option.value
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/*
            Bioregion chips — OneEarth biogeographic realms derived from country codes.
            Provides a higher-level geographic filter complementary to individual countries.
          */}
          <div className="overflow-x-auto scrollbar-hidden">
            <Suspense fallback={<CountryChipsSkeleton />}>
              <BioregionChips
                organizations={organizations}
                bioregionFilter={bioregionFilter}
                setBioregionFilter={setBioregionFilter}
              />
            </Suspense>
          </div>

          {/*
            Country chips — secondary dynamic content derived from organizations.
            In loading.tsx, organizations=[] so chips won't render, but the
            Suspense boundary shows CountryChipsSkeleton.
          */}
          <div className="overflow-x-auto scrollbar-hidden">
            <Suspense fallback={<CountryChipsSkeleton />}>
              <CountryChips
                organizations={organizations}
                countryFilter={countryFilter}
                setCountryFilter={setCountryFilter}
              />
            </Suspense>
          </div>
        </div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-6" />

        {/*
          Main content slot.
          - loading.tsx passes skeleton cards as children.
          - page.tsx passes nothing → Shell renders the real filtered grid.
        */}
        {children ??
          (filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <span
                className="text-7xl md:text-8xl font-light text-primary/[0.15] tracking-tight mb-4"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                0
              </span>
              <h3
                className="text-2xl md:text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-garamond-var)" }}
              >
                No organizations found
              </h3>
              <p
                className="text-base text-foreground/80 max-w-md leading-relaxed"
                style={{
                  fontFamily: "var(--font-instrument-serif-var)",
                  fontStyle: "italic",
                }}
              >
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <motion.div
              key={`${query}-${sort}-${countryFilter}-${bioregionFilter}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2 lg:gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((org) => (
                  <OrganizationCard key={org.did} org={org} />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
      </div>
    </section>
  );
}
