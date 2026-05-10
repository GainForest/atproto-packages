"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

type RecipientStatus =
  | { hasAttestation: true;  address: string; chainId: number }
  | { hasAttestation: false };

const recipientStatusSchema = z.union([
  z.object({
    hasAttestation: z.literal(true),
    address: z.string().min(1),
    chainId: z.number(),
  }),
  z.object({
    hasAttestation: z.literal(false),
  }),
]);

async function fetchRecipientStatus(orgDid: string): Promise<RecipientStatus> {
  const res = await fetch(`/api/verify-recipient?did=${encodeURIComponent(orgDid)}`);
  if (!res.ok) return { hasAttestation: false };
  const json = await res.json().catch(() => null);
  const parsed = recipientStatusSchema.safeParse(json);
  return parsed.success ? parsed.data : { hasAttestation: false };
}

/**
 * Queries /api/verify-recipient to check whether an org has a linked wallet.
 * The result is cached for 5 minutes — orgs rarely change their wallet.
 */
export function useRecipientVerify(orgDid: string) {
  return useQuery({
    queryKey:  ["recipient-verify", orgDid],
    queryFn:   () => fetchRecipientStatus(orgDid),
    retry:     false,
    enabled:   !!orgDid,
  });
}
