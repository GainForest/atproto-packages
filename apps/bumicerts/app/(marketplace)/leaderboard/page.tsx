import type { Metadata } from "next";
import { LeaderboardClient } from "./_components/LeaderboardClient";
import { links } from "@/lib/links";
import { requirePublicUrl } from "@/lib/url";
import { sharedOpenGraphImage, sharedTwitterImage } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See the top donors making an impact on Bumicerts. Our Impact Champions are ranked by their total funding contributions.",
  alternates: { canonical: links.leaderboard },
  openGraph: {
    title: "Leaderboard — Bumicerts",
    description:
      "See the top donors making an impact on Bumicerts. Our Impact Champions are ranked by their total funding contributions.",
    url: links.leaderboard,
    siteName: "Bumicerts",
    type: "website",
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard — Bumicerts",
    description:
      "See the top donors making an impact on Bumicerts. Our Impact Champions are ranked by their total funding contributions.",
    images: [sharedTwitterImage],
  },
};

function buildLeaderboardStructuredData(): Record<string, unknown>[] {
  const baseUrl = requirePublicUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Bumicerts leaderboard",
      description:
        "A ranked public leaderboard of donors funding verified regenerative impact through Bumicerts.",
      url: `${baseUrl}${links.leaderboard}`,
      about: {
        "@type": "Thing",
        name: "Regenerative impact funding leaderboard",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${baseUrl}${links.root}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Leaderboard",
          item: `${baseUrl}${links.leaderboard}`,
        },
      ],
    },
  ];
}

export default function LeaderboardPage() {
  const structuredData = buildLeaderboardStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LeaderboardClient />
    </>
  );
}
