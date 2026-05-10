import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrgAbout } from "./_components/OrgAbout";
import ErrorPage from "@/components/error-page";
import { links } from "@/lib/links";
import {
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
    return { title: "Account — Bumicerts" };
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

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <OrgAbout organization={routeData.organization} />
    </>
  );
}
