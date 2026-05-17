import type { Metadata } from "next";
import { FeaturesSection } from "./(marketplace)/_components/Home/FeaturesSection";
import { Hero } from "./(marketplace)/_components/Home/Hero";
import { HomeFooter } from "./(marketplace)/_components/Home/HomeFooter";
import { TopNavbar } from "./(marketplace)/_components/Navbar/TopNavbar";
import { UserOptionCards } from "./(marketplace)/_components/Home/UserOptionCards";
import { WhatIsBumicert } from "./(marketplace)/_components/Home/WhatIsBumicert";
import { links } from "@/lib/links";
import { sharedOpenGraphImage, sharedTwitterImage } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: "Fund Regenerative Impact",
  description:
    "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
  alternates: { canonical: links.root },
  openGraph: {
    title: "Bumicerts — Fund Regenerative Impact",
    description:
      "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
    url: links.root,
    siteName: "Bumicerts",
    type: "website",
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bumicerts — Fund Regenerative Impact",
    description:
      "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
    images: [sharedTwitterImage],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="w-full">
        <Hero />
        <FeaturesSection />
        <UserOptionCards />
        <WhatIsBumicert />
        <HomeFooter />
      </main>
    </div>
  );
}
