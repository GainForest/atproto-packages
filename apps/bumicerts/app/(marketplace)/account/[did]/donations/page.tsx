import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ErrorPage from "@/components/error-page";
import { DonationHistory } from "../../../user/[did]/_components/DonationHistory";
import {
  buildAccountDonationsMetadata,
  getAccountRouteData,
  readAccountRouteParams,
} from "../server/account-route";
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
    return { title: "Donation History — Bumicerts" };
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

  return (
    <section className="py-6">
      <DonationHistory userDid={did} />
    </section>
  );
}
