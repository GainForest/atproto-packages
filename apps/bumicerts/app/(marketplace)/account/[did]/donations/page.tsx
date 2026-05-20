import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ErrorPage from "@/components/error-page";
import { DonationHistory } from "@/components/account/DonationHistory";
import {
  AccountContentColumns,
  AccountSidebar,
} from "../_components/AccountSidebar";
import * as activitiesModule from "@/graphql/indexer/queries/activities";
import {
  DEFAULT_DONATIONS_METADATA,
  buildAccountDonationsMetadata,
  getAccountRouteData,
  readAccountRouteParams,
} from "../server/account-route";
import { buildAccountSidebarData } from "../server/account-sidebar";
import type { AccountRouteData } from "../server/account-route";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  try {
    const { did } = await readAccountRouteParams(params);
    return buildAccountDonationsMetadata(await getAccountRouteData(did));
  } catch {
    return DEFAULT_DONATIONS_METADATA;
  }
}

export default async function AccountDonationsPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did } = await readAccountRouteParams(params);
  let routeData: AccountRouteData;

  try {
    routeData = await getAccountRouteData(did);
  } catch (error) {
    console.error("[AccountDonationsPage] Failed to read account", did, error);
    return (
      <ErrorPage
        title="Couldn't load this account"
        description="We had trouble fetching this account's data. Please try again."
        error={error}
      />
    );
  }

  if (routeData.kind !== "user") {
    notFound();
  }

  let bumicertCount: number | null = null;

  try {
    bumicertCount = (await activitiesModule.fetch({ did })).length;
  } catch (error) {
    console.warn("[AccountDonationsPage] Failed to read account Bumicerts", did, error);
  }

  const sidebarData = await buildAccountSidebarData(routeData, {
    bumicertCount,
  });

  return (
    <AccountContentColumns sidebar={<AccountSidebar data={sidebarData} />}>
      <section className="py-6">
        <DonationHistory userDid={did} />
      </section>
    </AccountContentColumns>
  );
}
