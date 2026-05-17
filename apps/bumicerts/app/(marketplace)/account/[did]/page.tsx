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
    return (
      <ErrorPage
        title="Couldn't load this account"
        description="We had trouble fetching this account's data. Please try again."
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
  const organizationsUrl = new URL(links.allOrganizations, routeData.pageUrl).toString();
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Organizations",
        item: organizationsUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: routeData.organization.displayName,
        item: routeData.pageUrl,
      },
    ],
  };
  const jsonLd = structuredData
    ? [structuredData, breadcrumbStructuredData]
    : [breadcrumbStructuredData];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OrgAbout organization={routeData.organization} />
    </>
  );
}
