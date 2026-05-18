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
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import type { OrganizationData } from "@/lib/types";
import { requirePublicUrl } from "@/lib/url";

const DEFAULT_ACCOUNT_METADATA: Metadata = { title: "Account — Bumicerts" };
const DEFAULT_BUMICERTS_METADATA: Metadata = {
  title: "Bumicerts — Bumicerts",
};
const DEFAULT_DONATIONS_METADATA: Metadata = {
  title: "Donation History — Bumicerts",
};

const unknownAccount = (did: string): UnknownAccountState => ({
  kind: "unknown",
  did,
  profile: null,
  organization: null,
});

export type AccountRouteParams = {
  didOrHandle: string;
  did: string;
  handle: string | null;
};

type AccountRouteBase = {
  did: string;
  handle: string | null;
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
  params: Promise<{ didOrHandle: string }>,
): Promise<AccountRouteParams> {
  const { didOrHandle: encodedDidOrHandle } = await params;
  const didOrHandle = decodeURIComponent(encodedDidOrHandle);

  return resolveAccountRouteIdentifier(didOrHandle);
}

const resolveAccountRouteIdentifier = cache(async (
  didOrHandle: string,
): Promise<AccountRouteParams> => {
  if (didOrHandle.startsWith("did:")) {
    const profile = await readActorProfile(didOrHandle);

    return {
      didOrHandle,
      did: didOrHandle,
      handle: normalizeHandle(profile?.handle),
    };
  }

  const profile = await readActorProfile(didOrHandle);
  if (!profile?.did) {
    return {
      didOrHandle,
      did: didOrHandle,
      handle: didOrHandle,
    };
  }

  return {
    didOrHandle,
    did: profile.did,
    handle: normalizeHandle(profile.handle) ?? didOrHandle,
  };
});

const readActorProfile = cache(async (
  actor: string,
): Promise<{ did?: string; handle?: string } | null> => {
  try {
    const indexer = await getIndexerCaller();
    return await indexer.actor.profile({ handleOrDid: actor });
  } catch {
    return null;
  }
});

function normalizeHandle(handle: string | null | undefined): string | null {
  if (!handle || handle === "handle.invalid") {
    return null;
  }

  return handle;
}

const readAccountByDid = cache(async (
  did: string,
): Promise<AuthenticatedAccountState> => {
  const indexer = await getIndexerCaller();
  return indexer.account.byDid({ did });
});

export const getAccountRouteData = cache(async (
  paramsOrDid: AccountRouteParams | string,
): Promise<AccountRouteData> => {
  const resolved = typeof paramsOrDid === "string"
    ? await resolveAccountRouteIdentifier(paramsOrDid)
    : paramsOrDid;
  const { did, handle } = resolved;
  const pageUrl = buildPublicAccountUrl(handle ?? did);

  if (!did.startsWith("did:")) {
    return {
      kind: "unknown",
      did,
      handle,
      account: unknownAccount(did),
      pageUrl,
    };
  }

  const account = await readAccountByDid(did);

  if (account.kind === "unknown") {
    return {
      kind: "unknown",
      did,
      handle,
      account,
      pageUrl,
    };
  }

  if (account.kind === "user") {
    return {
      kind: "user",
      did,
      handle,
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
    handle,
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
      : (routeData.account.profile.displayName ?? "Account");
  const description =
    routeData.organization.shortDescription.trim().length > 0
      ? routeData.organization.shortDescription
      : `${displayName} on Bumicerts.`;
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

export function buildAccountBumicertsMetadata(
  routeData: AccountRouteData,
): Metadata {
  if (routeData.kind === "unknown") {
    return DEFAULT_BUMICERTS_METADATA;
  }

  const displayName = routeData.organization.displayName.trim().length
    ? routeData.organization.displayName
    : (routeData.account.profile.displayName ?? "Account");

  return {
    title: `${displayName} Bumicerts — Bumicerts`,
    description: `Browse all Bumicerts created by ${displayName}.`,
    alternates: {
      canonical: buildPublicUrl(links.account.bumicerts(routeData.handle ?? routeData.did)),
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
    title: `${displayName} Donation History — Bumicerts`,
    description: `Browse the public donation history for ${displayName}.`,
    alternates: {
      canonical: buildPublicUrl(links.account.donations(routeData.handle ?? routeData.did)),
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

function buildPublicAccountUrl(didOrHandle: string): string {
  return buildPublicUrl(links.account.byDidOrHandle(didOrHandle));
}

function buildPublicUrl(pathname: string): string {
  return `${requirePublicUrl()}${pathname}`;
}
