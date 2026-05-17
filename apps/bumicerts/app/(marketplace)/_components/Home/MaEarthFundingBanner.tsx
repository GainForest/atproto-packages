import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

const HIGHLIGHTS = [
  "$500k matching pool",
  "Nature-based projects",
  "Use your Bumicert record",
];

export function MaEarthFundingBanner() {
  return (
    <section className="px-6 pb-8 pt-0 sm:px-12 md:px-6 md:pb-12">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-primary/[0.06] shadow-sm shadow-primary/5">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1.5 shadow-sm">
                <Image
                  src="/assets/media/images/maearth/icon.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                MaEarth Funding Round 3
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1.5 text-muted-foreground shadow-sm">
                <CalendarDaysIcon className="size-3.5" />
                Applications close end of May 2026
              </span>
            </div>
            <h2 className="font-instrument text-3xl italic leading-[1.05] tracking-[-0.03em] text-foreground sm:text-4xl md:text-5xl">
              Apply for the MaEarth Funding Round 3
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              GainForest communities can bring verified project stories,
              evidence, and impact records from Bumicerts into MaEarth’s
              community-backed funding round.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {HIGHLIGHTS.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-full bg-background/75 px-3 py-1.5 text-xs font-medium text-foreground/75 shadow-sm"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild size="lg" className="shadow-lg shadow-primary/15">
              <Link href={links.maEarthApply}>
                Apply with your Bumicert
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={links.maEarthFundingRound}>
                Learn about the round
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
