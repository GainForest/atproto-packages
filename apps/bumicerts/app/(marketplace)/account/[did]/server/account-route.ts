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
import {
  getLocalizedAbsoluteUrl,
  getLocalizedAbsoluteUrls,
  noIndexMetadata,
  sharedOpenGraphImage,
} from "@/lib/seo-metadata";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import type { OrganizationData } from "@/lib/types";

export const DEFAULT_ACCOUNT_METADATA: Metadata = noIndexMetadata("Account");
export const DEFAULT_BUMICERTS_METADATA: Metadata = noIndexMetadata("Bumicerts");
export const DEFAULT_DONATIONS_METADATA: Metadata = noIndexMetadata("Donation History");

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
  const pageUrl = await buildPublicAccountUrl(did);

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
    return DEFAULT_ACCOUNT_METADATA;
  }

  if (routeData.kind === "user") {
    const displayName = routeData.organization.displayName;
    const description =
      routeData.account.profile.description ?? t("profileDescription", { displayName });

    return {
      title: displayName,
      description,
      alternates: {
        canonical: routeData.pageUrl,
        languages: getLocalizedAbsoluteUrls(links.account.byDid(routeData.did)),
      },
      openGraph: {
        title: displayName,
        description,
        url: routeData.pageUrl,
        siteName: "Bumicerts",
        type: "profile",
        images: [{ ...sharedOpenGraphImage, alt: displayName }],
      },
      twitter: {
        card: "summary_large_image",
        title: displayName,
        description,
        images: [{ ...sharedOpenGraphImage, alt: displayName }],
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

  const image = coverImageUrl
    ? {
        url: coverImageUrl,
        width: 1200,
        height: 630,
        alt: displayName,
      }
    : { ...sharedOpenGraphImage, alt: displayName };

  return {
    title: displayName,
    description,
    alternates: {
      canonical: routeData.pageUrl,
      languages: getLocalizedAbsoluteUrls(links.account.byDid(routeData.did)),
    },
    openGraph: {
      title: displayName,
      description,
      url: routeData.pageUrl,
      siteName: "Bumicerts",
      type: "profile",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description,
      images: [image],
    },
  };
}

export async function buildAccountBumicertsMetadata(
  routeData: AccountRouteData,
): Promise<Metadata> {
  const t = await getTranslations("marketplace.account.metadata");

  if (routeData.kind === "unknown") {
    return DEFAULT_BUMICERTS_METADATA;
  }

  const displayName = routeData.organization.displayName.trim().length
    ? routeData.organization.displayName
    : (routeData.account.profile.displayName ?? t("accountFallback"));

  return {
    title: t("bumicertsPageTitle", { displayName }),
    description: t("bumicertsPageDescription", { displayName }),
    alternates: {
      canonical: await buildPublicUrl(links.account.bumicerts(routeData.did)),
      languages: getLocalizedAbsoluteUrls(links.account.bumicerts(routeData.did)),
    },
  };
}

export async function buildAccountDonationsMetadata(
  routeData: AccountRouteData,
): Promise<Metadata> {
  const t = await getTranslations("marketplace.account.metadata");

  if (routeData.kind !== "user") {
    return DEFAULT_DONATIONS_METADATA;
  }

  const displayName = routeData.organization.displayName;

  return {
    title: t("donationsPageTitle", { displayName }),
    description: t("donationsPageDescription", { displayName }),
    alternates: {
      canonical: await buildPublicUrl(links.account.donations(routeData.did)),
      languages: getLocalizedAbsoluteUrls(links.account.donations(routeData.did)),
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

async function buildPublicAccountUrl(did: string): Promise<string> {
  return buildPublicUrl(links.account.byDid(did));
}

async function buildPublicUrl(pathname: string): Promise<string> {
  return getLocalizedAbsoluteUrl(pathname);
}
