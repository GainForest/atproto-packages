import { describe, expect, it } from "bun:test";
import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";
import { aggregateToLeaderboard } from "./leaderboard";

function donorParty(donorType: "did" | "wallet", donorId: string): FundingReceiptItem["record"]["from"] {
  if (donorType === "did") {
    return { $type: "app.certified.defs#did", did: donorId };
  }

  return { $type: "org.hypercerts.funding.receipt#text", value: donorId };
}

function receipt(input: {
  donorType: "did" | "wallet";
  donorId: string;
  amount: string;
  occurredAt: string;
  projectUri: string;
  currency?: string;
}): FundingReceiptItem {
  return {
    metadata: {
      did: "did:plc:facilitator",
      uri: `at://did:plc:facilitator/org.hypercerts.funding.receipt/${input.donorId}-${input.occurredAt}`,
      rkey: `${input.donorId}-${input.occurredAt}`,
      cid: "cid",
      createdAt: input.occurredAt,
      indexedAt: null,
    },
    record: {
      from: donorParty(input.donorType, input.donorId),
      to: { $type: "org.hypercerts.funding.receipt#text", value: "0xrecipient" },
      amount: input.amount,
      currency: input.currency ?? "USDC",
      paymentRail: "eip3009",
      paymentNetwork: "base",
      transactionId: "0xtx",
      for: { uri: input.projectUri, cid: "projectCid" },
      notes: null,
      occurredAt: input.occurredAt,
      createdAt: input.occurredAt,
    },
  };
}

const receipts = [
  receipt({
    donorType: "did",
    donorId: "did:plc:alice",
    amount: "50",
    occurredAt: "2026-01-10T00:00:00.000Z",
    projectUri: "at://project/one",
  }),
  receipt({
    donorType: "wallet",
    donorId: "0x1111111111111111111111111111111111111111",
    amount: "100",
    occurredAt: "2026-01-09T00:00:00.000Z",
    projectUri: "at://project/two",
  }),
  receipt({
    donorType: "did",
    donorId: "did:plc:alice",
    amount: "25",
    occurredAt: "2026-01-12T00:00:00.000Z",
    projectUri: "at://project/two",
  }),
  receipt({
    donorType: "wallet",
    donorId: "0x2222222222222222222222222222222222222222",
    amount: "10",
    occurredAt: "2026-01-08T00:00:00.000Z",
    projectUri: "at://project/three",
  }),
  receipt({
    donorType: "did",
    donorId: "did:plc:ignored",
    amount: "999",
    occurredAt: "2026-01-07T00:00:00.000Z",
    projectUri: "at://project/ignored",
    currency: "EUR",
  }),
];

describe("aggregateToLeaderboard", () => {
  it("filters anonymous and known donors while preserving totals for the filtered view", () => {
    const all = aggregateToLeaderboard(receipts);
    expect(all.totalDonorsCount).toBe(3);
    expect(all.totalAmountSum).toBe(185);
    expect(all.totalProjectsSupported).toBe(3);

    const anonymous = aggregateToLeaderboard(receipts, { donorFilter: "anonymous" });
    expect(anonymous.entries.map((entry) => entry.donorType)).toEqual(["wallet", "wallet"]);
    expect(anonymous.totalAmountSum).toBe(110);
    expect(anonymous.totalProjectsSupported).toBe(2);

    const known = aggregateToLeaderboard(receipts, { donorFilter: "known" });
    expect(known.entries).toHaveLength(1);
    expect(known.entries[0]?.donorId).toBe("did:plc:alice");
    expect(known.totalAmountSum).toBe(75);
    expect(known.totalProjectsSupported).toBe(2);
  });

  it("sorts the visible donors by supported leaderboard dimensions", () => {
    const byTotalRaised = aggregateToLeaderboard(receipts, { sortBy: "total-raised" });
    expect(byTotalRaised.entries.map((entry) => entry.donorId)).toEqual([
      "0x1111111111111111111111111111111111111111",
      "did:plc:alice",
      "0x2222222222222222222222222222222222222222",
    ]);

    const byDonationCount = aggregateToLeaderboard(receipts, { sortBy: "donation-count" });
    expect(byDonationCount.entries[0]?.donorId).toBe("did:plc:alice");
    expect(byDonationCount.entries[0]?.rank).toBe(1);

    const byRecentDonation = aggregateToLeaderboard(receipts, { sortBy: "recent-donation" });
    expect(byRecentDonation.entries[0]?.donorId).toBe("did:plc:alice");
  });
});
