import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type {
  AuthenticatedAccountState,
  OrganizationAccountState,
  UnknownAccountState,
  UserAccountState,
} from "@/lib/account";
import {
  buildOrganizationDataFromOrganizationAccount,
  buildOrganizationDataFromUserAccount,
} from "@/lib/account/server";
import { links } from "@/lib/links";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import type { OrganizationData } from "@/lib/types";
import { requirePublicUrl } from "@/lib/url";

export type AccountRouteParams = {
  did: string;
};

type AccountRouteBase = {
  did: string;
  pageUrl: string;
};

type UnknownAccountRouteData = AccountRouteBase & {
  kind: "unknown";
  account: UnknownAccountState;
};

type OnboardedAccountRouteData = AccountRouteBase & {
  kind: "user" | "organization";
  account: UserAccountState | OrganizationAccountState;
  organization: OrganizationData;
};

export type AccountRouteData =
  | UnknownAccountRouteData
  | OnboardedAccountRouteData;

export async function readAccountRouteParams(
  params: Promise<{ did: string }>,
): Promise<AccountRouteParams> {
  const { did: encodedDid } = await params;

  return {
    did: decodeURIComponent(encodedDid),
  };
}

const readAccountByDid = cache(async (
  did: string,
): Promise<AuthenticatedAccountState> => {
  const indexer = await getIndexerCaller();
  return indexer.account.byDid({ did });
});

export const getAccountRouteData = cache(async (
  did: string,
): Promise<AccountRouteData> => {
  const account = await readAccountByDid(did);
  const pageUrl = buildPublicAccountUrl(did);

  if (account.kind === "unknown") {
    return {
      kind: "unknown",
      did,
      account,
      pageUrl,
    };
  }

  if (account.kind === "user") {
    return {
      kind: "user",
      did,
      account,
      organization: buildOrganizationDataFromUserAccount(account, {
        displayNameFallback: did,
      }),
      pageUrl,
    };
  }

  return {
    kind: "organization",
    did,
    account,
    organization: buildOrganizationDataFromOrganizationAccount(account),
    pageUrl,
  };
});

export async function buildAccountPageMetadata(
  routeData: AccountRouteData,
): Promise<Metadata> {
  const t = await getTranslations("marketplace.account.metadata");

  if (routeData.kind === "unknown") {
    return { title: t("accountTitle") };
  }

  if (routeData.kind === "user") {
    const displayName = routeData.organization.displayName;
    const description =
      routeData.account.profile.description ?? t("profileDescription", { displayName });

    return {
      title: `${displayName} — Bumicerts`,
      description,
      alternates: { canonical: routeData.pageUrl },
      openGraph: {
        title: displayName,
        description,
        url: routeData.pageUrl,
        siteName: "Bumicerts",
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: displayName,
        description,
      },
    };
  }

  const displayName =
    routeData.organization.displayName.trim().length > 0
      ? routeData.organization.displayName
      : (routeData.account.profile.displayName ?? t("accountFallback"));
  const description =
    routeData.organization.shortDescription.trim().length > 0
      ? routeData.organization.shortDescription
      : t("organizationDescription", { displayName });
  const coverImageUrl = routeData.organization.coverImageUrl;

  return {
    title: `${displayName} — Bumicerts`,
    description,
    alternates: { canonical: routeData.pageUrl },
    openGraph: {
      title: displayName,
      description,
      url: routeData.pageUrl,
      siteName: "Bumicerts",
      type: "profile",
      ...(coverImageUrl
        ? {
            images: [
              {
                url: coverImageUrl,
                width: 1200,
                height: 630,
                alt: displayName,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: coverImageUrl ? "summary_large_image" : "summary",
      title: displayName,
      description,
    },
  };
}

export async function buildAccountBumicertsMetadata(
  routeData: AccountRouteData,
): Promise<Metadata> {
  const t = await getTranslations("marketplace.account.metadata");

  if (routeData.kind === "unknown") {
    return { title: t("bumicertsTitle") };
  }

  const displayName = routeData.organization.displayName.trim().length
    ? routeData.organization.displayName
    : (routeData.account.profile.displayName ?? t("accountFallback"));

  return {
    title: t("bumicertsPageTitle", { displayName }),
    description: t("bumicertsPageDescription", { displayName }),
    alternates: {
      canonical: buildPublicUrl(links.account.bumicerts(routeData.did)),
    },
  };
}

export async function buildAccountDonationsMetadata(
  routeData: AccountRouteData,
): Promise<Metadata> {
  const t = await getTranslations("marketplace.account.metadata");

  if (routeData.kind !== "user") {
    return { title: t("donationsTitle") };
  }

  const displayName = routeData.organization.displayName;

  return {
    title: t("donationsPageTitle", { displayName }),
    description: t("donationsPageDescription", { displayName }),
    alternates: {
      canonical: buildPublicUrl(links.account.donations(routeData.did)),
    },
  };
}

export function buildAccountStructuredData(
  routeData: AccountRouteData,
): Record<string, unknown> | null {
  if (routeData.kind !== "organization") {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": routeData.pageUrl,
    name: routeData.organization.displayName,
    description: routeData.organization.shortDescription || undefined,
    url: routeData.organization.website ?? routeData.pageUrl,
    ...(routeData.organization.startDate
      ? { foundingDate: routeData.organization.startDate.slice(0, 10) }
      : {}),
    ...(routeData.organization.country
      ? {
          address: {
            "@type": "PostalAddress",
            addressCountry: routeData.organization.country,
          },
        }
      : {}),
    ...(routeData.organization.website
      ? { sameAs: [routeData.organization.website] }
      : {}),
    ...(routeData.organization.logoUrl
      ? {
          logo: {
            "@type": "ImageObject",
            url: routeData.organization.logoUrl,
          },
        }
      : {}),
  };
}

function buildPublicAccountUrl(did: string): string {
  return buildPublicUrl(links.account.byDid(did));
}

function buildPublicUrl(pathname: string): string {
  return `${requirePublicUrl()}${pathname}`;
}
