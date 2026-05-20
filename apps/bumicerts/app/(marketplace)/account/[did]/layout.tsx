import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
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
import { getTranslations } from "next-intl/server";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ did: string }>;
}) {
  const { did } = await readAccountRouteParams(params);
  let session: Awaited<ReturnType<typeof auth.session.getSession>>;
  let routeData: AccountRouteData;

  try {
    [session, routeData] = await Promise.all([
      auth.session.getSession(),
      getAccountRouteData(did),
    ]);
  } catch (error) {
    console.error("[AccountLayout] Failed to read account", did, error);
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
        <OrgHero organization={routeData.organization} showEditButton={isOwner} />
        <OrgTabBar did={routeData.organization.did} accountKind={routeData.kind} />
        {children}
      </Container>
    </main>
  );
}
