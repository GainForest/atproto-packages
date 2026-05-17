import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
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
import { sharedOpenGraphImage } from "@/lib/seo-metadata";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import type { OrganizationData } from "@/lib/types";
import { requirePublicUrl } from "@/lib/url";

export const DEFAULT_ACCOUNT_METADATA: Metadata = {
  title: "Account",
  robots: {
    index: false,
    follow: false,
  },
};
export const DEFAULT_BUMICERTS_METADATA: Metadata = {
  title: "Bumicerts",
  robots: {
    index: false,
    follow: false,
  },
};
export const DEFAULT_DONATIONS_METADATA: Metadata = {
  title: "Donation History",
  robots: {
    index: false,
    follow: false,
  },
};

type SocialImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

function buildSharedSocialImage(alt: string): SocialImage {
  return {
    url: buildPublicUrl(sharedOpenGraphImage.url),
    width: sharedOpenGraphImage.width,
    height: sharedOpenGraphImage.height,
    alt,
  };
}

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

export function buildAccountPageMetadata(
  routeData: AccountRouteData,
): Metadata {
  if (routeData.kind === "unknown") {
    return DEFAULT_ACCOUNT_METADATA;
  }

  if (routeData.kind === "user") {
    const displayName = routeData.organization.displayName;
    const description =
      routeData.account.profile.description ?? `${displayName} on Bumicerts`;

    return {
      title: displayName,
      description,
      alternates: { canonical: routeData.pageUrl },
      openGraph: {
        title: displayName,
        description,
        url: routeData.pageUrl,
        siteName: "Bumicerts",
        type: "profile",
        images: [buildSharedSocialImage(displayName)],
      },
      twitter: {
        card: "summary_large_image",
        title: displayName,
        description,
        images: [buildSharedSocialImage(displayName).url],
      },
    };
  }

  const displayName =
    routeData.organization.displayName.trim().length > 0
      ? routeData.organization.displayName
      : (routeData.account.profile.displayName ?? "Account");
  const description =
    routeData.organization.shortDescription.trim().length > 0
      ? routeData.organization.shortDescription
      : `${displayName} on Bumicerts.`;
  const coverImageUrl = routeData.organization.coverImageUrl;
  const socialImage: SocialImage = coverImageUrl
    ? {
        url: coverImageUrl,
        width: 1200,
        height: 630,
        alt: displayName,
      }
    : buildSharedSocialImage(displayName);

  return {
    title: displayName,
    description,
    alternates: { canonical: routeData.pageUrl },
    openGraph: {
      title: displayName,
      description,
      url: routeData.pageUrl,
      siteName: "Bumicerts",
      type: "profile",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description,
      images: [socialImage.url],
    },
  };
}

export function buildAccountBumicertsMetadata(
  routeData: AccountRouteData,
): Metadata {
  if (routeData.kind === "unknown") {
    return DEFAULT_BUMICERTS_METADATA;
  }

  const displayName = routeData.organization.displayName.trim().length
    ? routeData.organization.displayName
    : (routeData.account.profile.displayName ?? "Account");

  const pageUrl = buildPublicUrl(links.account.bumicerts(routeData.did));
  const description = `Browse all Bumicerts created by ${displayName}.`;
  const coverImageUrl = routeData.organization.coverImageUrl;
  const socialImage: SocialImage = coverImageUrl
    ? {
        url: coverImageUrl,
        width: 1200,
        height: 630,
        alt: displayName,
      }
    : buildSharedSocialImage(displayName);

  return {
    title: `${displayName} Bumicerts`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${displayName} Bumicerts`,
      description,
      url: pageUrl,
      siteName: "Bumicerts",
      type: "website",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} Bumicerts`,
      description,
      images: [socialImage.url],
    },
  };
}

export function buildAccountDonationsMetadata(
  routeData: AccountRouteData,
): Metadata {
  if (routeData.kind !== "user") {
    return DEFAULT_DONATIONS_METADATA;
  }

  const displayName = routeData.organization.displayName;

  return {
    title: `${displayName} Donation History`,
    description: `Browse the public donation history for ${displayName}.`,
    alternates: {
      canonical: buildPublicUrl(links.account.donations(routeData.did)),
    },
    robots: {
      index: false,
      follow: false,
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
    url: routeData.pageUrl,
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

export function buildPublicUrl(pathname: string): string {
  return `${requirePublicUrl()}${pathname}`;
}
