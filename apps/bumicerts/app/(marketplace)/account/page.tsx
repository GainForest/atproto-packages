import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { links } from "@/lib/links";
import { AccountOnboardingRequired } from "./_components/AccountOnboardingRequired";
import ErrorPage from "@/components/error-page";
import { getTranslations } from "next-intl/server";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";

export default async function AccountPage() {
  const session = await auth.session.getSession();

  if (!session.isLoggedIn || !session.did) {
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
