import { getTranslations } from "next-intl/server";
import { LeaderboardClient } from "./_components/LeaderboardClient";
import { links } from "@/lib/links";
import { buildPublicPageMetadata, getLocalizedAbsoluteUrl, jsonLd } from "@/lib/seo-metadata";

export async function generateMetadata() {
  const t = await getTranslations("marketplace.leaderboard.metadata");

  return buildPublicPageMetadata({
    pathname: links.leaderboard,
    title: t("title"),
    description: t("description"),
  });
}

export default async function LeaderboardPage() {
  const pageUrl = await getLocalizedAbsoluteUrl(links.leaderboard);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bumicerts leaderboard",
    description:
      "A ranked public leaderboard of donors funding verified regenerative impact through Bumicerts.",
    url: pageUrl,
    about: {
      "@type": "Thing",
      name: "Regenerative impact funding leaderboard",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <LeaderboardClient />
    </>
  );
}
