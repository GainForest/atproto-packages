import { activitiesToBumicertDataArray } from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { ExploreShell } from "./_components/ExploreShell";
import { getTranslations } from "next-intl/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { links } from "@/lib/links";
import { buildPublicPageMetadata, getLocalizedAbsoluteUrl, jsonLd } from "@/lib/seo-metadata";

export async function generateMetadata() {
  const t = await getTranslations("marketplace.explore.metadata");

  return {
    ...(await buildPublicPageMetadata({
      pathname: links.explore,
      title: t("title"),
      description: t("description"),
    })),
  };
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

  const t = await getTranslations("marketplace.explore.structuredData");
  const pageUrl = await getLocalizedAbsoluteUrl(links.explore);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("name"),
    description: t("description"),
    numberOfItems: bumicerts.length,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: bumicerts.length,
      itemListElement: bumicerts.slice(0, 20).map((bumicert, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: bumicert.title,
        url: pageUrl,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
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
