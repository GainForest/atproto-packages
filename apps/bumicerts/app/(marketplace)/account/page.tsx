import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/current-session";
import { links } from "@/lib/links";
import { AccountOnboardingRequired } from "./_components/AccountOnboardingRequired";
import ErrorPage from "@/components/error-page";
import { getTranslations } from "next-intl/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { noIndexMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = noIndexMetadata();

export default async function AccountPage() {
  const session = await getCurrentSession();

  if (!session.did) {
    redirect(links.home);
  }

  let account;
  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did: session.did });
  } catch (error) {
    console.error("[AccountPage] Failed to read account", session.did, error);
    const t = await getTranslations("marketplace.account.errors");
    return (
      <ErrorPage
        title={t("loadOwnTitle")}
        description={t("loadOwnDescription")}
        error={error}
      />
    );
  }

  if (account.kind === "organization" || account.kind === "user") {
    redirect(links.account.byDid(session.did));
  }

  return <AccountOnboardingRequired />;
}
