import "server-only";

import * as fundingReceiptsModule from "@/graphql/indexer/queries/fundingReceipts";
import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";
import { getTranslations } from "next-intl/server";
import { clientEnv } from "@/lib/env/client";
import { links } from "@/lib/links";
import {
  extractDonor,
  extractOrgDidFromFor,
} from "@/lib/utils/extract-donor";
import type { AccountRouteData } from "./account-route";

type DonationMetrics =
  | {
      status: "available";
      donationCount: number;
      organizationCount: number;
      donorCount: number;
      totalAmount: number;
    }
  | { status: "unavailable" };

export type AccountSidebarData = {
  accountKind: "user" | "organization";
  displayName: string;
  inviteTitle: string;
  inviteDescription: string;
  inviteActionLabel: string;
  inviteHref: string;
  achievementsHref: string;
  stats: Array<{
    label: string;
    value: string;
    icon: "bumicert" | "donation";
  }>;
  achievements: Array<{
    label: string;
    description: string;
    icon: "profile" | "bumicert" | "donation";
  }>;
};

type SidebarOptions = {
  bumicertCount: number | null;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: number): string {
  return numberFormatter.format(value);
}

function formatBumicertCount(count: number | null): string {
  return count === null ? "—" : formatCount(count);
}

function safeAmount(raw: string | null | undefined): number {
  const parsed = Number.parseFloat(raw ?? "0");
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function readFundingReceipts(): Promise<FundingReceiptItem[] | null> {
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";

  if (!facilitatorDid) {
    return null;
  }

  try {
    return await fundingReceiptsModule.fetch({ did: facilitatorDid });
  } catch (error) {
    console.warn("[account-sidebar] Failed to read funding receipts", error);
    return null;
  }
}

function deriveDonationMetrics(
  did: string,
  accountKind: "user" | "organization",
  receipts: FundingReceiptItem[] | null,
): DonationMetrics {
  if (!receipts) {
    return { status: "unavailable" };
  }

  if (accountKind === "user") {
    const userReceipts = receipts.filter((receipt) => {
      const donor = extractDonor(receipt.record.from);
      return donor?.type === "did" && donor.id === did;
    });
    const organizationDids = new Set(
      userReceipts.flatMap((receipt) => {
        const orgDid = extractOrgDidFromFor(receipt.record.for);
        return orgDid ? [orgDid] : [];
      }),
    );

    return {
      status: "available",
      donationCount: userReceipts.length,
      organizationCount: organizationDids.size,
      donorCount: 0,
      totalAmount: userReceipts.reduce(
        (sum, receipt) => sum + safeAmount(receipt.record.amount),
        0,
      ),
    };
  }

  const receivedReceipts = receipts.filter(
    (receipt) => extractOrgDidFromFor(receipt.record.for) === did,
  );
  const donors = new Set(
    receivedReceipts.flatMap((receipt) => {
      const donor = extractDonor(receipt.record.from);
      return donor ? [`${donor.type}:${donor.id}`] : [];
    }),
  );

  return {
    status: "available",
    donationCount: receivedReceipts.length,
    organizationCount: 0,
    donorCount: donors.size,
    totalAmount: receivedReceipts.reduce(
      (sum, receipt) => sum + safeAmount(receipt.record.amount),
      0,
    ),
  };
}

function buildDonationDescription(
  accountKind: "user" | "organization",
  metrics: DonationMetrics,
  t: Awaited<ReturnType<typeof getSidebarTranslations>>,
): string {
  if (metrics.status === "unavailable") {
    return t("donationUnavailable");
  }

  if (accountKind === "user") {
    if (metrics.donationCount === 0) {
      return t("noPublicDonationsRecorded");
    }

    return t("supportedOrganizations", {
      count: metrics.organizationCount,
    });
  }

  if (metrics.donationCount === 0) {
    return t("noPublicDonationsReceived");
  }

  return t("receivedDonations", { count: metrics.donationCount });
}

function buildProfileDescription(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  t: Awaited<ReturnType<typeof getSidebarTranslations>>,
): string {
  const details = [
    routeData.organization.shortDescription.trim().length > 0,
    routeData.organization.website !== null,
    routeData.organization.logoUrl !== null,
    routeData.organization.coverImageUrl !== null,
    routeData.organization.country.trim().length > 0,
    routeData.organization.startDate !== null,
  ].filter(Boolean).length;

  if (details === 0) {
    return t("setupPublicProfile");
  }

  return t("completedProfileDetails", { count: details });
}

function buildAchievements(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  bumicertCount: number | null,
  metrics: DonationMetrics,
  t: Awaited<ReturnType<typeof getSidebarTranslations>>,
): AccountSidebarData["achievements"] {
  const publishedDescription =
    bumicertCount === null
      ? t("bumicertUnavailable")
      : bumicertCount > 0
        ? t("publishedBumicerts", { count: bumicertCount })
        : t("noBumicertsPublished");

  return [
    {
      label: t("profileReady"),
      description: buildProfileDescription(routeData, t),
      icon: "profile",
    },
    {
      label: routeData.kind === "organization" ? t("bumicertSteward") : t("creatorSeed"),
      description: publishedDescription,
      icon: "bumicert",
    },
    {
      label: routeData.kind === "organization" ? t("communityBacked") : t("impactSupporter"),
      description: buildDonationDescription(routeData.kind, metrics, t),
      icon: "donation",
    },
  ];
}

function buildInviteCopy(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  t: Awaited<ReturnType<typeof getSidebarTranslations>>,
): Pick<
  AccountSidebarData,
  "inviteTitle" | "inviteDescription" | "inviteActionLabel" | "inviteHref"
> {
  const displayName = routeData.organization.displayName;

  if (routeData.kind === "organization") {
    return {
      inviteTitle: t("inviteCollaborators"),
      inviteDescription: t("inviteCollaboratorsDescription"),
      inviteActionLabel: t("inviteCollaborators"),
      inviteHref: links.external.share.x(
        t("shareOrganization", { displayName, pageUrl: routeData.pageUrl }),
      ),
    };
  }

  return {
    inviteTitle: t("inviteFriends"),
    inviteDescription: t("inviteFriendsDescription"),
    inviteActionLabel: t("inviteFriends"),
    inviteHref: links.external.share.x(
      t("shareUser", { pageUrl: routeData.pageUrl }),
    ),
  };
}

async function getSidebarTranslations() {
  return getTranslations("marketplace.account.sidebar");
}

export async function buildAccountSidebarData(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  options: SidebarOptions,
): Promise<AccountSidebarData> {
  const t = await getSidebarTranslations();
  const receipts = await readFundingReceipts();
  const donationMetrics = deriveDonationMetrics(
    routeData.did,
    routeData.kind,
    receipts,
  );
  const donationValue =
    donationMetrics.status === "available"
      ? formatCount(donationMetrics.donationCount)
      : "—";

  return {
    accountKind: routeData.kind,
    displayName: routeData.organization.displayName,
    ...buildInviteCopy(routeData, t),
    achievementsHref: `${links.account.bumicerts(routeData.did)}#account-achievements`,
    stats: [
      {
        label: t("totalBumicerts"),
        value: formatBumicertCount(options.bumicertCount),
        icon: "bumicert",
      },
      {
        label: routeData.kind === "organization" ? t("donationsReceived") : t("totalDonations"),
        value: donationValue,
        icon: "donation",
      },
    ],
    achievements: buildAchievements(routeData, options.bumicertCount, donationMetrics, t),
  };
}
