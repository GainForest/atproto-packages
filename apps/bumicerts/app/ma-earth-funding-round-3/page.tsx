import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  ExternalLinkIcon,
  FileTextIcon,
  LeafIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { HomeFooter } from "../(marketplace)/_components/Home/HomeFooter";
import { TopNavbar } from "../(marketplace)/_components/Navbar/TopNavbar";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

export const metadata: Metadata = {
  title: "Apply for MaEarth Funding Round 3 — Bumicerts",
  description:
    "Learn how GainForest communities can apply to MaEarth Funding Round 3 with a Bumicert and prepare for the $500,000 matching pool.",
};

const ROUND_FACTS = [
  {
    label: "Matching pool",
    value: "$500,000",
    description: "Community support is amplified through MaEarth’s matching model.",
  },
  {
    label: "Project funding range",
    value: "$2k–$15k",
    description: "For specific, feasible nature-based work with clear reporting.",
  },
  {
    label: "Application window",
    value: "End of May 2026",
    description: "Public sources list May 31 / June 1 depending on timezone.",
  },
];

const ELIGIBILITY_ITEMS = [
  "Nature-based restoration, conservation, agriculture, water, soil, biodiversity, or community projects.",
  "A specific plan with goals, timeframe, reporting capacity, and authentic success claims.",
  "A funding need between USD $2,000 and $15,000 for project-specific work.",
  "A Stripe-supported country setup or a fiscal host partner that can receive funds.",
];

const IMPORT_ITEMS = [
  "Project story and short description",
  "Organization identity and public profile",
  "Photos, evidence, and documented impact claims",
  "Location or site references when available",
  "A public Bumicert link funders can review",
];

const TIMELINE = [
  { date: "May 31 / June 1", event: "Applications close" },
  { date: "June 15", event: "Applicants notified" },
  { date: "July 1", event: "Accepted projects join the round" },
  { date: "July 21", event: "Round closes and funding is paid" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
      {children}
    </div>
  );
}

export default function MaEarthFundingRoundPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-[#f7f0e8]">
        <TopNavbar />
        <main className="w-full pt-24">
          <section className="relative overflow-hidden px-6 pb-14 pt-10 text-center sm:px-12 md:px-6 md:pb-20 md:pt-16">
          <Image
            src="/assets/media/images/maearth/hero-pattern.webp"
            alt=""
            width={925}
            height={1062}
            priority
            className="pointer-events-none absolute -bottom-72 -right-64 z-0 hidden rotate-[65.76deg] opacity-70 md:block"
          />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center">
            <Image
              src="/assets/media/images/maearth/icon.svg"
              alt="MaEarth"
              width={54}
              height={54}
              priority
              className="mb-6 text-foreground"
            />
            <h1 className="max-w-4xl font-instrument text-[3.05rem] italic leading-[0.95] tracking-[-0.05em] text-foreground sm:text-6xl md:text-7xl">
              Bring your Bumicert to MaEarth Funding Round 3
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              MaEarth is running a community-backed funding round with a $500,000
              matching pool for nature-based projects. If your organization
              already documents impact through Bumicerts, choose a Bumicert and
              use that verified record instead of starting from scratch.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-lg shadow-primary/15">
                <Link href={links.maEarthApply}>
                  Apply with your Bumicert
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={links.external.maEarth.fundraise} target="_blank" rel="noreferrer">
                  Open MaEarth round
                  <ExternalLinkIcon />
                </Link>
              </Button>
            </div>

            <aside className="mt-10 max-w-md rounded-[2rem] bg-primary/[0.07] p-6 shadow-sm shadow-primary/5">
              <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-background/80 text-primary shadow-sm">
                <CircleDollarSignIcon className="size-6" />
              </div>
              <p className="font-instrument text-4xl italic tracking-[-0.04em] text-foreground">
                $500,000
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-primary">
                Matching pool
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                MaEarth uses quadratic funding: broader supporter participation
                can matter more than one large contribution.
              </p>
            </aside>
          </div>
          </section>
        </main>
      </div>

      <main className="w-full">
        <section className="bg-muted/25 px-6 py-8 text-center sm:px-12 md:px-6">
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {ROUND_FACTS.map((fact) => (
              <article key={fact.label} className="rounded-[1.5rem] bg-background p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {fact.label}
                </p>
                <p className="mt-3 font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
                  {fact.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {fact.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 text-center sm:px-12 md:px-6 md:py-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <Eyebrow>
              <ShieldCheckIcon className="size-4" />
              Why apply with a Bumicert?
            </Eyebrow>
            <h2 className="font-instrument text-4xl italic leading-tight tracking-[-0.04em] text-foreground sm:text-5xl">
              Your impact record should travel with your application.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
              A Bumicert gathers the project story, organization context,
              location, photos, and evidence that funders need to trust the work.
              It helps bridge verified community work to MaEarth’s funding
              process.
            </p>

            <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
              {IMPORT_ITEMS.map((item) => (
                <div key={item} className="flex flex-col items-center gap-3 rounded-[1.25rem] bg-muted/45 p-4">
                  <CheckCircle2Icon className="size-5 text-primary" />
                  <p className="text-sm leading-6 text-foreground/80">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 text-center sm:px-12 md:px-6 md:pb-24">
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] bg-card p-6 shadow-sm sm:p-8">
              <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LeafIcon className="size-6" />
              </div>
              <h2 className="font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
                Who is eligible?
              </h2>
              <ul className="mt-5 space-y-4">
                {ELIGIBILITY_ITEMS.map((item) => (
                  <li key={item} className="flex flex-col items-center gap-2 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2Icon className="size-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2rem] bg-card p-6 shadow-sm sm:p-8">
              <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDaysIcon className="size-6" />
              </div>
              <h2 className="font-instrument text-3xl italic tracking-[-0.03em] text-foreground">
                Round timeline
              </h2>
              <div className="mt-6 space-y-4">
                {TIMELINE.map((step) => (
                  <div key={`${step.date}-${step.event}`} className="rounded-[1.25rem] bg-muted/45 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {step.date}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-6 text-foreground">
                      {step.event}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="px-6 pb-20 text-center sm:px-12 md:px-6">
          <div className="mx-auto max-w-4xl rounded-[2rem] bg-primary/[0.07] p-6 shadow-sm shadow-primary/5 sm:p-10">
            <div className="flex flex-col items-center">
              <Eyebrow>
                <FileTextIcon className="size-4" />
                Application handoff
              </Eyebrow>
              <h2 className="max-w-3xl font-instrument text-4xl italic tracking-[-0.04em] text-foreground">
                Choose the Bumicert that best represents your funding project.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                You will review your public Bumicert, confirm consent to share
                its project identifiers with MaEarth, and continue into the
                MaEarth importer flow.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={links.maEarthApply}>
                    Apply with your Bumicert
                    <ArrowRightIcon />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={links.bumicert.create}>
                    Create a Bumicert first
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
