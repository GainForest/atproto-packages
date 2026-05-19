import { AllOrgsShell } from "./_components/AllOrgsShell";
import { listOrganizationData } from "@/lib/account/server";
import ErrorPage from "@/components/error-page";
import type { OrganizationData } from "@/lib/types";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("marketplace.organizations.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AllOrganizationsPage() {
  let organizations: OrganizationData[] = [];
  let fetchError = false;

  try {
    organizations = await listOrganizationData({
      limit: 1000,
      labelTier: "high-quality",
    });
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    fetchError = true;
  }

  if (fetchError) {
    const t = await getTranslations("marketplace.organizations.error");

    return (
      <ErrorPage
        title={t("title")}
        description={t("description")}
        showRefreshButton
        showHomeButton={false}
      />
    );
  }

  return <AllOrgsShell organizations={organizations} animate={false} />;
}
