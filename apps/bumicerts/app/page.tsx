import { FeaturesSection } from "./(marketplace)/_components/Home/FeaturesSection";
import { Hero } from "./(marketplace)/_components/Home/Hero";
import { HomeFooter } from "./(marketplace)/_components/Home/HomeFooter";
import { MaEarthFundingBanner } from "./(marketplace)/_components/Home/MaEarthFundingBanner";
import { TopNavbar } from "./(marketplace)/_components/Navbar/TopNavbar";
import { UserOptionCards } from "./(marketplace)/_components/Home/UserOptionCards";
import { WhatIsBumicert } from "./(marketplace)/_components/Home/WhatIsBumicert";

export const metadata = {
  title: "Bumicerts — Fund Regenerative Impact",
  description:
    "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="w-full">
        <Hero />
        <MaEarthFundingBanner />
        <FeaturesSection />
        <UserOptionCards />
        <WhatIsBumicert />
        <HomeFooter />
      </main>
    </div>
  );
}
