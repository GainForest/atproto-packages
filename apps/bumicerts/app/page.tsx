import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveSupportedLanguage } from "@/lib/i18n/languages";
import { getLocalizedPathnames, withLocalePrefix } from "@/lib/i18n/routing";
import { FeaturesSection } from "./(marketplace)/_components/Home/FeaturesSection";
import { Hero } from "./(marketplace)/_components/Home/Hero";
import { HomeFooter } from "./(marketplace)/_components/Home/HomeFooter";
import { TopNavbar } from "./(marketplace)/_components/Navbar/TopNavbar";
import { UserOptionCards } from "./(marketplace)/_components/Home/UserOptionCards";
import { WhatIsBumicert } from "./(marketplace)/_components/Home/WhatIsBumicert";

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveSupportedLanguage(await getLocale());
  const t = await getTranslations("common.seo");
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: {
      canonical: withLocalePrefix("/", locale),
      languages: getLocalizedPathnames("/"),
    },
    openGraph: {
      title,
      description,
      url: withLocalePrefix("/", locale),
      locale,
    },
  };
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
