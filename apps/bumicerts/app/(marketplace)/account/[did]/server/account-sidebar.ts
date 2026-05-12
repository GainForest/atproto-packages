import "server-only";

import * as fundingReceiptsModule from "@/graphql/indexer/queries/fundingReceipts";
import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";
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

function pluralize(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
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
): string {
  if (metrics.status === "unavailable") {
    return "Donation records are not available right now";
  }

  if (accountKind === "user") {
    if (metrics.donationCount === 0) {
      return "No public donations recorded yet";
    }

    return `Supported ${formatCount(metrics.organizationCount)} ${pluralize(metrics.organizationCount, "organization", "organizations")}`;
  }

  if (metrics.donationCount === 0) {
    return "No public donations received yet";
  }

  return `Received ${formatCount(metrics.donationCount)} ${pluralize(metrics.donationCount, "donation", "donations")}`;
}

function buildProfileDescription(routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>): string {
  const details = [
    routeData.organization.shortDescription.trim().length > 0,
    routeData.organization.website !== null,
    routeData.organization.logoUrl !== null,
    routeData.organization.coverImageUrl !== null,
    routeData.organization.country.trim().length > 0,
    routeData.organization.startDate !== null,
  ].filter(Boolean).length;

  if (details === 0) {
    return "Set up a public Bumicerts profile";
  }

  return `Completed ${formatCount(details)} profile ${pluralize(details, "detail", "details")}`;
}

function buildAchievements(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  bumicertCount: number | null,
  metrics: DonationMetrics,
): AccountSidebarData["achievements"] {
  const publishedDescription =
    bumicertCount === null
      ? "Bumicert records are not available right now"
      : bumicertCount > 0
        ? `Published ${formatCount(bumicertCount)} ${pluralize(bumicertCount, "Bumicert", "Bumicerts")}`
        : "No Bumicerts published yet";

  return [
    {
      label: "Profile Ready",
      description: buildProfileDescription(routeData),
      icon: "profile",
    },
    {
      label: routeData.kind === "organization" ? "Bumicert Steward" : "Creator Seed",
      description: publishedDescription,
      icon: "bumicert",
    },
    {
      label: routeData.kind === "organization" ? "Community Backed" : "Impact Supporter",
      description: buildDonationDescription(routeData.kind, metrics),
      icon: "donation",
    },
  ];
}

function buildInviteCopy(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
): Pick<
  AccountSidebarData,
  "inviteTitle" | "inviteDescription" | "inviteActionLabel" | "inviteHref"
> {
  const displayName = routeData.organization.displayName;

  if (routeData.kind === "organization") {
    return {
      inviteTitle: "Invite collaborators",
      inviteDescription:
        "Bring supporters and collaborators into your Bumicerts work and grow your regenerative impact together.",
      inviteActionLabel: "Invite collaborators",
      inviteHref: links.external.share.x(
        `Explore ${displayName}'s Bumicerts profile: ${routeData.pageUrl}`,
      ),
    };
  }

  return {
    inviteTitle: "Invite friends",
    inviteDescription:
      "Invite your friends to join Bumicerts and create a positive impact together.",
    inviteActionLabel: "Invite friends",
    inviteHref: links.external.share.x(
      `Join me on Bumicerts and support regenerative impact: ${routeData.pageUrl}`,
    ),
  };
}

export async function buildAccountSidebarData(
  routeData: Extract<AccountRouteData, { kind: "user" | "organization" }>,
  options: SidebarOptions,
): Promise<AccountSidebarData> {
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
    ...buildInviteCopy(routeData),
    achievementsHref: `${links.account.bumicerts(routeData.did)}#account-achievements`,
    stats: [
      {
        label: "Total Bumicerts",
        value: formatBumicertCount(options.bumicertCount),
        icon: "bumicert",
      },
      {
        label: routeData.kind === "organization" ? "Donations Received" : "Total Donations",
        value: donationValue,
        icon: "donation",
      },
    ],
    achievements: buildAchievements(routeData, options.bumicertCount, donationMetrics),
  };
}
