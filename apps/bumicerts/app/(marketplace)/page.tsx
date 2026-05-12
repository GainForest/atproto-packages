import { Hero } from "./_components/Home/Hero";
import { FeaturesSection } from "./_components/Home/FeaturesSection";
import { UserOptionCards } from "./_components/Home/UserOptionCards";
import { TestimonialsSection } from "./_components/Home/TestimonialsSection";
import { WhatIsBumicert } from "./_components/Home/WhatIsBumicert";
import { HomeFooter } from "./_components/Home/HomeFooter";

export const metadata = {
  title: "Bumicerts — Fund Regenerative Impact",
  description:
    "Connect with nature stewards doing verified on-ground restoration work. Fund real environmental impact through digital certificates.",
};

export default function HomePage() {
  return (
    <div className="w-full bg-background">
      <Hero />
      <FeaturesSection />
      <UserOptionCards />
      {/*<TestimonialsSection />*/}
      <WhatIsBumicert />
      <HomeFooter />
    </div>
  );
}
