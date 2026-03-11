"use server";

/**
 * Server Actions for app.bumicerts.funding.config operations.
 *
 * The funding.config rkey must match the associated claim.activity rkey
 * so the indexer can join them via the shared-rkey pattern.
 */

import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
import { upsertFundingConfigAction } from "@gainforest/atproto-mutations-next/actions";
import { auth } from "@/lib/auth";

export type UpsertFundingConfigInput = {
  /** Must match the bumicert's rkey — shared-rkey join in the indexer. */
  rkey: string;
  receivingWalletUri: string;
  status?: "open" | "coming-soon" | "paused" | "closed";
  goalInUSD?: string;
  minDonationInUSD?: string;
  maxDonationInUSD?: string;
  allowOversell?: boolean;
};

export async function upsertFundingConfig(input: UpsertFundingConfigInput) {
  const agentLayer = makeUserAgentLayer(auth);

  return upsertFundingConfigAction(
    {
      rkey: input.rkey,
      receivingWallet: {
        $type: "app.bumicerts.funding.config#evmLinkRef",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uri: input.receivingWalletUri as any, // AtUriString brand
      },
      status: input.status ?? "open",
      ...(input.goalInUSD        ? { goalInUSD:        input.goalInUSD        } : {}),
      ...(input.minDonationInUSD ? { minDonationInUSD: input.minDonationInUSD } : {}),
      ...(input.maxDonationInUSD ? { maxDonationInUSD: input.maxDonationInUSD } : {}),
      ...(input.allowOversell != null ? { allowOversell: input.allowOversell } : {}),
      updatedAt: new Date().toISOString(),
    },
    agentLayer
  );
}
