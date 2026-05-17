import type { Metadata } from "next";
import { activitiesToBumicertDataArray } from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreShell } from "./_components/ExploreShell";
import { requirePublicUrl } from "@/lib/url";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { links } from "@/lib/links";
import { sharedOpenGraphImage, sharedTwitterImage } from "@/lib/seo-metadata";

const STRUCTURED_DATA_ITEM_LIMIT = 20;

export const metadata: Metadata = {
  title: "Explore Verified Regenerative Impact Projects",
  description:
    "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
  alternates: { canonical: links.explore },
  openGraph: {
    title: "Explore Bumicerts — Verified Regenerative Impact Projects",
    description:
      "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
    url: links.explore,
    siteName: "Bumicerts",
    type: "website",
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Bumicerts — Verified Regenerative Impact Projects",
    description:
      "Browse verified environmental impact certificates from nature stewards around the world. Filter by country, organization, and impact area.",
    images: [sharedTwitterImage],
  },
};

function buildExploreStructuredData(
  bumicerts: BumicertData[],
): Record<string, unknown>[] {
  const baseUrl = requirePublicUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Bumicerts",
      description:
        "Verified environmental impact certificates from nature stewards around the world.",
      numberOfItems: bumicerts.length,
      url: `${baseUrl}${links.explore}`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: bumicerts.length,
        itemListElement: bumicerts
          .slice(0, STRUCTURED_DATA_ITEM_LIMIT)
          .map((bumicert, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: bumicert.title,
            url: `${baseUrl}${links.bumicert.view(bumicert.organizationDid, bumicert.rkey)}`,
          })),
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
          name: "Explore",
          item: `${baseUrl}${links.explore}`,
        },
      ],
    },
  ];
}

export default async function ExplorePage() {
  let bumicerts: BumicertData[] = [];

  try {
    const caller = await getIndexerCaller();
    const response = await caller.activities.list({
      limit: 1000,
      hasImage: true,
      hasOrganizationInfoRecord: true,
      labelTier: "high-quality",
    });
    // list() with no `did` returns { data, pageInfo }
    const activities = "data" in response ? response.data : [];
    bumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    console.error("Failed to fetch bumicerts:", error);
  }

  const structuredData = buildExploreStructuredData(bumicerts);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/*
        ExploreShell renders the static chrome (heading, search, sort, filter chips).
        bumicerts is fetched once here and passed to the Shell — it uses it for both
        filter chip options and the grid (no duplicate fetches).

        No children passed → Shell renders the real filtered BumicertGrid itself.
        loading.tsx passes a skeleton as children instead.
      */}
      <ExploreShell bumicerts={bumicerts} animate={false} />
    </>
  );
}
