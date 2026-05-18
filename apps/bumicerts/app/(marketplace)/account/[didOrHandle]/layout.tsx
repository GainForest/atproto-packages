import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { links } from "@/lib/links";
import { OrgHero } from "@/components/account/OrgHero";
import { OrgTabBar } from "./_components/OrgTabBar";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";
import { AccountOnboardingRequired } from "../_components/AccountOnboardingRequired";
import {
  getAccountRouteData,
  readAccountRouteParams,
} from "./server/account-route";
import type { AccountRouteData } from "./server/account-route";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ didOrHandle: string }>;
}) {
  const routeParams = await readAccountRouteParams(params);
  const { did } = routeParams;
  let session: Awaited<ReturnType<typeof auth.session.getSession>>;
  let routeData: AccountRouteData;

  try {
    [session, routeData] = await Promise.all([
      auth.session.getSession(),
      getAccountRouteData(routeParams),
    ]);
  } catch (error) {
    console.error("[AccountLayout] Failed to read account", did, error);
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

  const isOwner = session.isLoggedIn && session.did === did;

  if (routeData.kind === "unknown") {
    if (!isOwner) {
      notFound();
    }

    return (
      <main className="w-full">
        <AccountOnboardingRequired />
      </main>
    );
  }

  return (
    <main className="w-full">
      <Container className="pt-4 pb-8">
        <OrgHero
          organization={routeData.organization}
          publicHref={links.account.byDidOrHandle(routeData.handle ?? routeData.did)}
          showEditButton={isOwner}
        />
        <OrgTabBar
          accountIdentifier={routeData.handle ?? routeData.did}
          accountKind={routeData.kind}
        />
        {children}
      </Container>
    </main>
  );
}
