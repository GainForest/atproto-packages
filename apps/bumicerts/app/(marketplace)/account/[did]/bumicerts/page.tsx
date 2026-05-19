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
import type { BumicertData } from "@/lib/types";
import * as activitiesModule from "@/graphql/indexer/queries/activities";
import {
  buildAccountBumicertsMetadata,
  getAccountRouteData,
  readAccountRouteParams,
} from "../server/account-route";
import { buildAccountSidebarData } from "../server/account-sidebar";
import type { AccountRouteData } from "../server/account-route";
import { getTranslations } from "next-intl/server";

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
          : (options?.organizationName ?? bumicert.organizationName),
      logoUrl: bumicert.logoUrl ?? options?.logoUrl ?? null,
    };
  });
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
    const t = await getTranslations("marketplace.account.metadata");
    return { title: t("bumicertsTitle") };
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
    const t = await getTranslations("marketplace.account.errors");
    return (
      <Container className="pt-4">
        <ErrorPage
          title={t("loadAccountTitle")}
          description={t("loadAccountDescription")}
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
    const t = await getTranslations("marketplace.account.errors");
    return (
      <Container className="pt-4">
        <ErrorPage
          title={t("loadBumicertsTitle")}
          description={t("loadBumicertsDescription")}
          error={error}
        />
      </Container>
    );
  }

  const sidebarData = await buildAccountSidebarData(routeData, {
    bumicertCount: bumicerts.length,
  });
  const t = await getTranslations("marketplace.account.bumicerts");

  return (
    <AccountContentColumns sidebar={<AccountSidebar data={sidebarData} />}>
      <OrgBumicertsGrid
        bumicerts={withCreatorDisplayFallbacks(bumicerts, {
          organizationName: routeData.organization.displayName || t("unknownCreator"),
          logoUrl: routeData.organization.logoUrl,
        })}
      />
    </AccountContentColumns>
  );
}
