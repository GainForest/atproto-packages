import type { Metadata } from "next";
import { listOrganizationData } from "@/lib/account/server";
import { DashboardClient } from "./_components/DashboardClient";
import { links } from "@/lib/links";
import { requirePublicUrl } from "@/lib/url";
import { sharedOpenGraphImage, sharedTwitterImage } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  title: "Donations Dashboard",
  description:
    "Platform-wide donations analytics: total raised, unique donors, funding trends, and recent transactions.",
  alternates: { canonical: links.dashboard },
  openGraph: {
    title: "Donations Dashboard — Bumicerts",
    description:
      "Platform-wide donations analytics: total raised, unique donors, funding trends, and recent transactions.",
    url: links.dashboard,
    siteName: "Bumicerts",
    type: "website",
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Donations Dashboard — Bumicerts",
    description:
      "Platform-wide donations analytics: total raised, unique donors, funding trends, and recent transactions.",
    images: [sharedTwitterImage],
  },
};

/**
 * Fetches every organization's DID → country code mapping server-side so the
 * dashboard can display geographic-reach stats without an extra client query.
 *
 * Returns a plain `Record<string, string>` (serialisable across the
 * server/client boundary). On failure the map is empty — the dashboard still
 * renders, just without geographic data.
 */
function buildDashboardStructuredData(): Record<string, unknown> {
  const baseUrl = requirePublicUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Bumicerts donation analytics",
    description:
      "Platform-wide donation metrics for Bumicerts, including total raised, unique donors, funding trends, and recent transactions.",
    url: `${baseUrl}${links.dashboard}`,
    creator: {
      "@type": "Organization",
      name: "GainForest",
      url: "https://gainforest.earth",
    },
    measurementTechnique:
      "Donation receipts indexed from org.hypercerts.funding.receipt records.",
  };
}

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
  const structuredData = buildDashboardStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <DashboardClient orgCountryMap={orgCountryMap} />
    </>
  );
}
