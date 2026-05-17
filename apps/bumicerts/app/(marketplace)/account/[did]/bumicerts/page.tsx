import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgBumicertsGrid } from "./_components/OrgBumicertsGrid";
import {
  AccountContentColumns,
  AccountSidebar,
} from "../_components/AccountSidebar";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { activitiesToBumicertDataArray } from "@/lib/adapters";
import { links } from "@/lib/links";
import type { BumicertData } from "@/lib/types";
import * as activitiesModule from "@/graphql/indexer/queries/activities";
import {
  DEFAULT_BUMICERTS_METADATA,
  buildAccountBumicertsMetadata,
  buildPublicUrl,
  getAccountRouteData,
  readAccountRouteParams,
} from "../server/account-route";
import { buildAccountSidebarData } from "../server/account-sidebar";
import type { AccountRouteData } from "../server/account-route";

const STRUCTURED_DATA_ITEM_LIMIT = 20;

type KnownAccountRouteData = Extract<
  AccountRouteData,
  { kind: "user" | "organization" }
>;

function withCreatorDisplayFallbacks(
  bumicerts: BumicertData[],
  options?: {
    organizationName?: string;
    logoUrl?: string | null;
  },
): BumicertData[] {
  return bumicerts.map((bumicert) => {
    const normalizedOrganizationName = bumicert.organizationName.trim();

    return {
      ...bumicert,
      organizationName:
        normalizedOrganizationName.length > 0 &&
          normalizedOrganizationName.toLowerCase() !== "unknown"
          ? bumicert.organizationName
          : (options?.organizationName ?? "Unknown"),
      logoUrl: bumicert.logoUrl ?? options?.logoUrl ?? null,
    };
  });
}

function buildBumicertsCollectionStructuredData(
  routeData: KnownAccountRouteData,
  bumicerts: BumicertData[],
): Record<string, unknown>[] {
  const pageUrl = buildPublicUrl(links.account.bumicerts(routeData.did));
  const displayName = routeData.organization.displayName;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": pageUrl,
      name: `${displayName} Bumicerts`,
      description: `Browse all Bumicerts created by ${displayName}.`,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: bumicerts.length,
        itemListElement: bumicerts
          .slice(0, STRUCTURED_DATA_ITEM_LIMIT)
          .map((bumicert, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: bumicert.title,
            url: buildPublicUrl(
              links.bumicert.view(bumicert.organizationDid, bumicert.rkey),
            ),
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
          name: "Organizations",
          item: buildPublicUrl(links.allOrganizations),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: displayName,
          item: routeData.pageUrl,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${displayName} Bumicerts`,
          item: buildPublicUrl(links.account.bumicerts(routeData.did)),
        },
      ],
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  try {
    const { did } = await readAccountRouteParams(params);
    return buildAccountBumicertsMetadata(await getAccountRouteData(did));
  } catch {
    return DEFAULT_BUMICERTS_METADATA;
  }
}

export default async function AccountBumicertsPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did } = await readAccountRouteParams(params);
  let routeData: AccountRouteData;

  try {
    routeData = await getAccountRouteData(did);
  } catch (error) {
    console.error("[AccountBumicertsPage] Failed to read account", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this account"
          description="We had trouble fetching this account's data. Please try again."
          error={error}
        />
      </Container>
    );
  }

  if (routeData.kind === "unknown") {
    notFound();
  }

  let bumicerts: BumicertData[];

  try {
    const activities = await activitiesModule.fetch({ did });
    bumicerts = activitiesToBumicertDataArray(activities);
  } catch (error) {
    console.error("[AccountBumicertsPage] Error fetching activities", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this account's Bumicerts"
          description="We had trouble fetching this account's Bumicerts. Please try again."
          error={error}
        />
      </Container>
    );
  }

  const sidebarData = await buildAccountSidebarData(routeData, {
    bumicertCount: bumicerts.length,
  });
  const displayBumicerts = withCreatorDisplayFallbacks(bumicerts, {
    organizationName: routeData.organization.displayName,
    logoUrl: routeData.organization.logoUrl,
  });
  const structuredData = buildBumicertsCollectionStructuredData(
    routeData,
    displayBumicerts,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AccountContentColumns sidebar={<AccountSidebar data={sidebarData} />}>
        <OrgBumicertsGrid bumicerts={displayBumicerts} />
      </AccountContentColumns>
    </>
  );
}
