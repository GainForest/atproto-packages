import type { Metadata } from "next";
import { AllOrgsShell } from "./_components/AllOrgsShell";
import { listOrganizationData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import type { OrganizationData } from "@/lib/types";
import { links } from "@/lib/links";
import { requirePublicUrl } from "@/lib/url";
import { sharedOpenGraphImage, sharedTwitterImage } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organizations",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
  alternates: { canonical: links.allOrganizations },
  openGraph: {
    title: "Organizations — Bumicerts",
    description:
      "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
    url: links.allOrganizations,
    siteName: "Bumicerts",
    type: "website",
    images: [sharedOpenGraphImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Organizations — Bumicerts",
    description:
      "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
    images: [sharedTwitterImage],
  },
};

function buildOrganizationsStructuredData(
  organizations: OrganizationData[],
): Record<string, unknown>[] {
  const baseUrl = requirePublicUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Bumicerts organizations",
      description:
        "Nature steward organizations creating verified environmental impact on Bumicerts.",
      url: `${baseUrl}${links.allOrganizations}`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: organizations.length,
        itemListElement: organizations.map((organization, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${baseUrl}${links.account.byDid(organization.did)}`,
          name: organization.displayName,
          description: organization.shortDescription || undefined,
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
          name: "Organizations",
          item: `${baseUrl}${links.allOrganizations}`,
        },
      ],
    },
  ];
}

export default async function AllOrganizationsPage() {
  let organizations: OrganizationData[] = [];
  let fetchError = false;

  try {
    organizations = await listOrganizationData({
      limit: 1000,
      labelTier: "high-quality",
    });
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    fetchError = true;
  }

  if (fetchError) {
    return (
      <ErrorPage
        title="Something went wrong"
        description="We were unable to load the organizations. Please try refreshing the page."
        showRefreshButton
        showHomeButton={false}
      />
    );
  }

  const structuredData = buildOrganizationsStructuredData(organizations);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AllOrgsShell organizations={organizations} animate={false} />
    </>
  );
}
