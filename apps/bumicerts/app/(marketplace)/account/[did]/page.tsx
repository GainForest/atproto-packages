import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrgAbout } from "@/components/account/OrgAbout";
import ErrorPage from "@/components/error-page";
import { links } from "@/lib/links";
import {
  DEFAULT_ACCOUNT_METADATA,
  buildAccountPageMetadata,
  buildAccountStructuredData,
  getAccountRouteData,
  readAccountRouteParams,
} from "./server/account-route";
import type { AccountRouteData } from "./server/account-route";
import { getTranslations } from "next-intl/server";
import { getLocalizedAbsoluteUrl, jsonLd } from "@/lib/seo-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  try {
    const { did } = await readAccountRouteParams(params);
    return buildAccountPageMetadata(await getAccountRouteData(did));
  } catch {
    return DEFAULT_ACCOUNT_METADATA;
  }
}

export default async function AccountByDidPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did } = await readAccountRouteParams(params);
  let routeData: AccountRouteData;

  try {
    routeData = await getAccountRouteData(did);
  } catch (error) {
    console.error("[AccountByDidPage] Failed to read account", did, error);
    const t = await getTranslations("marketplace.account.errors");
    return (
      <ErrorPage
        title={t("loadAccountTitle")}
        description={t("loadAccountDescription")}
        error={error}
      />
    );
  }

  if (routeData.kind === "unknown") {
    notFound();
  }

  if (routeData.kind === "user") {
    redirect(links.account.bumicerts(did));
  }

  const structuredData = buildAccountStructuredData(routeData);
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Organizations",
        item: await getLocalizedAbsoluteUrl(links.allOrganizations),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: routeData.organization.displayName,
        item: routeData.pageUrl,
      },
    ],
  };
  const jsonLdData = structuredData
    ? [structuredData, breadcrumbStructuredData]
    : [breadcrumbStructuredData];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdData) }}
      />
      <OrgAbout organization={routeData.organization} />
    </>
  );
}
