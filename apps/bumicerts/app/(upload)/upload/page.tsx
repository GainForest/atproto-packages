import type { AuthenticatedAccountState } from "@/lib/account";
import { getCurrentSession } from "@/lib/current-session";
import { ManageDashboardClient } from "./_components/UploadDashboardClient";
import { buildUploadAccountPageData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { links } from "@/lib/links";
import { shouldClearDashboardMode } from "./_components/uploadDashboardMode";

type UploadPageSearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

function buildUploadRedirectHref(
  searchParams: Awaited<UploadPageSearchParams>,
): string {
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "mode" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        nextSearchParams.append(key, item);
      }
      continue;
    }

    nextSearchParams.set(key, value);
  }

  const queryString = nextSearchParams.toString();
  return queryString ? `${links.manage.home}?${queryString}` : links.manage.home;
}

/**
 * /upload — Organization profile page (view + edit modes)
 *
 * Auth is enforced by the (MANAGE) layout. Mode stays owned by nuqs on the
 * client, but this server boundary clears stale or invalid `?mode=` values
 * before hydration so the URL stays authoritative.
 *
 * SSR/SEO is intentionally not required for this route.
 */
export default async function UploadPage({
  searchParams,
}: {
  searchParams: UploadPageSearchParams;
}) {
  const t = await getTranslations("upload.errors");
  const session = await getCurrentSession();

  // Layout already guards against unauthenticated access, but we need the
  // session data here. If somehow reached without auth, render nothing —
  // the layout's SignInPrompt covers this case.
  if (!session.isLoggedIn || !session.did) return null;

  const resolvedSearchParams = await searchParams;

  let account: AuthenticatedAccountState;

  try {
    const indexer = await getIndexerCaller();
    account = await indexer.account.byDid({ did: session.did });
  } catch (error) {
    console.error("[UploadPage] Failed to read account", session.did, error);
    return (
      <ErrorPage
        title={t("accountTitle")}
        description={t("accountDescription")}
        error={error}
      />
    );
  }

  if (
    shouldClearDashboardMode({
      currentKind: account.kind,
      rawMode: resolvedSearchParams.mode,
    })
  ) {
    redirect(buildUploadRedirectHref(resolvedSearchParams));
  }

  let initialData: Awaited<ReturnType<typeof buildUploadAccountPageData>>;

  try {
    initialData = await buildUploadAccountPageData(account);
  } catch (error) {
    console.error(
      "[UploadPage] Failed to build account page data",
      session.did,
      error,
    );
    return (
      <ErrorPage
        title={t("accountTitle")}
        description={t("accountDescription")}
        error={error}
      />
    );
  }

  return (
    <ManageDashboardClient
      did={session.did}
      initialAccount={account}
      initialData={initialData}
    />
  );
}
