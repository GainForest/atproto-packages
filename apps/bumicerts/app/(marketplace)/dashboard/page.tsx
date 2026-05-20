import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listOrganizationData } from "@/lib/account/server";
import { DashboardClient } from "./_components/DashboardClient";
import { links } from "@/lib/links";
import { buildPublicPageMetadata, getLocalizedAbsoluteUrl, jsonLd } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace.dashboard.metadata");

  return buildPublicPageMetadata({
    pathname: links.dashboard,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Fetches every organization's DID → country code mapping server-side so the
 * dashboard can display geographic-reach stats without an extra client query.
 *
 * Returns a plain `Record<string, string>` (serialisable across the
 * server/client boundary). On failure the map is empty — the dashboard still
 * renders, just without geographic data.
 */
async function fetchOrgCountryMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const orgs = await listOrganizationData({ limit: 1000 });
    for (const org of orgs) {
      const did = org.did;
      const country = org.country;
      if (did && country) {
        map[did] = country;
      }
    }
  } catch (error) {
    console.error("Failed to fetch org country data for dashboard:", error);
  }
  return map;
}

export default async function DashboardPage() {
  const orgCountryMap = await fetchOrgCountryMap();
  const pageUrl = await getLocalizedAbsoluteUrl(links.dashboard);
  const metadataT = await getTranslations("marketplace.dashboard.metadata");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: metadataT("title"),
    description: metadataT("description"),
    url: pageUrl,
    creator: {
      "@type": "Organization",
      name: "GainForest",
      url: "https://gainforest.earth",
    },
    measurementTechnique: metadataT("measurementTechnique"),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <DashboardClient orgCountryMap={orgCountryMap} />
    </>
  );
}
