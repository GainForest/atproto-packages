import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPublicPageMetadata } from "@/lib/seo-metadata";
import { FeaturesSection } from "./(marketplace)/_components/Home/FeaturesSection";
import { Hero } from "./(marketplace)/_components/Home/Hero";
import { HomeFooter } from "./(marketplace)/_components/Home/HomeFooter";
import { TopNavbar } from "./(marketplace)/_components/Navbar/TopNavbar";
import { UserOptionCards } from "./(marketplace)/_components/Home/UserOptionCards";
import { WhatIsBumicert } from "./(marketplace)/_components/Home/WhatIsBumicert";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.seo");

  return buildPublicPageMetadata({
    pathname: "/",
    title: t("title"),
    description: t("description"),
  });
}

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
