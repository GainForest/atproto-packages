import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrgAbout } from "@/components/account/OrgAbout";
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
  params: Promise<{ didOrHandle: string }>;
}): Promise<Metadata> {
  try {
    const routeParams = await readAccountRouteParams(params);
    return buildAccountPageMetadata(await getAccountRouteData(routeParams));
  } catch {
    return { title: "Account — Bumicerts" };
  }
}

export default async function AccountByDidOrHandlePage({
  params,
}: {
  params: Promise<{ didOrHandle: string }>;
}) {
  const routeParams = await readAccountRouteParams(params);
  const { did } = routeParams;
  if (routeParams.didOrHandle.startsWith("did:") && routeParams.handle) {
    redirect(links.account.byDidOrHandle(routeParams.handle));
  }

  let routeData: AccountRouteData;

  try {
    routeData = await getAccountRouteData(routeParams);
  } catch (error) {
    console.error("[AccountByDidOrHandlePage] Failed to read account", did, error);
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
    redirect(links.account.bumicerts(routeData.handle ?? did));
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
