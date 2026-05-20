import { AllOrgsShell } from "./_components/AllOrgsShell";
import { listOrganizationData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import type { OrganizationData } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { links } from "@/lib/links";
import { buildPublicPageMetadata, getLocalizedAbsoluteUrl, jsonLd } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("marketplace.organizations.metadata");

  return buildPublicPageMetadata({
    pathname: links.allOrganizations,
    title: t("title"),
    description: t("description"),
  });
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
    const t = await getTranslations("marketplace.organizations.error");

    return (
      <ErrorPage
        title={t("title")}
        description={t("description")}
        showRefreshButton
        showHomeButton={false}
      />
    );
  }

  const pageUrl = await getLocalizedAbsoluteUrl(links.allOrganizations);
  const metadataT = await getTranslations("marketplace.organizations.metadata");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: metadataT("title"),
    description: metadataT("description"),
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: organizations.length,
      itemListElement: organizations.map((organization, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: organization.displayName,
        description: organization.shortDescription || undefined,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <AllOrgsShell organizations={organizations} animate={false} />
    </>
  );
}
