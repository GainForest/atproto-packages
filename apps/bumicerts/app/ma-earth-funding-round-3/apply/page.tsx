import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { HomeFooter } from "../../(marketplace)/_components/Home/HomeFooter";
import { TopNavbar } from "../../(marketplace)/_components/Navbar/TopNavbar";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { MaEarthBumicertChooser } from "./_components/MaEarthBumicertChooser";

export const metadata: Metadata = {
  title: "Apply with your Bumicert — MaEarth Funding Round 3",
  description:
    "Choose a published Bumicert and continue to the MaEarth Funding Round 3 importer.",
};

export default function MaEarthApplyPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="w-full px-6 pb-20 pt-32 text-center sm:px-12 md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <Button asChild variant="ghost" size="sm" className="mb-8">
            <Link href={links.maEarthFundingRound}>
              <ArrowLeftIcon />
              Back to round overview
            </Link>
          </Button>

          <section className="flex w-full flex-col items-center gap-10">
            <div className="flex max-w-3xl flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                MaEarth Funding Round 3
              </p>
              <h1 className="mt-4 max-w-xl font-instrument text-5xl italic leading-[0.98] tracking-[-0.05em] text-foreground sm:text-6xl">
                Apply with your Bumicert
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                Choose the Bumicert that best represents the project seeking
                funding. We will send MaEarth only the public identifiers needed
                to start the importer: your DID, selected Bumicert, and source.
              </p>
            </div>

            <MaEarthBumicertChooser />
          </section>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
