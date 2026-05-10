import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgBumicertsGrid } from "./_components/OrgBumicertsGrid";
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
import type { AccountRouteData } from "../server/account-route";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  try {
    const { did } = await readAccountRouteParams(params);
    return buildAccountBumicertsMetadata(await getAccountRouteData(did));
  } catch {
    return { title: "Bumicerts — Bumicerts" };
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

  return (
    <OrgBumicertsGrid
      bumicerts={withCreatorDisplayFallbacks(bumicerts, {
        organizationName: routeData.organization.displayName,
        logoUrl: routeData.organization.logoUrl,
      })}
    />
  );
}
