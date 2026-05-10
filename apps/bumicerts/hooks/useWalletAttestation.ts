"use client";

import { useState } from "react";
import { useSignTypedData, useAccount } from "wagmi";
import { z } from "zod";
import { useAtprotoStore } from "@/components/stores/atproto";
import { CHAIN_ID } from "@/lib/facilitator/usdc";

// EIP-712 domain for ATProto EVM attestation
const EIP712_DOMAIN = {
  name:    "ATProto EVM Attestation",
  version: "1",
} as const;

const EIP712_TYPES = {
  AttestLink: [
    { name: "did",        type: "string" },
    { name: "evmAddress", type: "string" },
    { name: "chainId",    type: "string" },
    { name: "timestamp",  type: "string" },
    { name: "nonce",      type: "string" },
  ],
} as const;

type LinkStatus = "idle" | "signing" | "writing" | "success" | "error";

type UseWalletAttestationResult = {
  /** Current status of the linking flow */
  status: LinkStatus;
  /** Error message, if any */
  error: string | null;
  /** The URI of the created attestation record (after success) */
  attestationUri: string | null;
  /** Trigger the sign + write flow */
  linkWallet: (name?: string) => Promise<void>;
  /** Reset to idle */
  reset: () => void;
};

const walletAttestationSuccessSchema = z.object({
  uri: z.string().min(1),
  rkey: z.string().min(1),
});

const walletAttestationErrorSchema = z.object({
  error: z.string().min(1),
});

/**
 * Hook that handles the complete EIP-712 sign + ATProto write flow
 * for linking an EVM wallet to the authenticated user's ATProto DID.
 *
 * Used in WalletLinkSection (org settings) and AddWalletModal (donation flow).
 */
export function useWalletAttestation(): UseWalletAttestationResult {
  const { address } = useAccount();
  const auth = useAtprotoStore((state) => state.auth);
  const [status, setStatus] = useState<LinkStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attestationUri, setAttestationUri] = useState<string | null>(null);

  const { signTypedDataAsync } = useSignTypedData();

  // Correctly read DID from auth.user when authenticated
  const donorDid =
    auth.status === "AUTHENTICATED" ? auth.user.did : "";

  const reset = () => {
    setStatus("idle");
    setError(null);
    setAttestationUri(null);
  };

  const linkWallet = async (name?: string) => {
    if (!address) {
      setError("No wallet connected. Connect a wallet first.");
      return;
    }
    if (!donorDid) {
      setError("Not signed in. Sign in to your Bumicerts account first.");
      return;
    }

    setStatus("signing");
    setError(null);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce     = String(Date.now());

    const message = {
      did:        donorDid,
      evmAddress: address,
      chainId:    String(CHAIN_ID),
      timestamp,
      nonce,
    };

    let signature: `0x${string}`;
    try {
      signature = await signTypedDataAsync({
        domain:      EIP712_DOMAIN,
        types:       EIP712_TYPES,
        primaryType: "AttestLink",
        message,
      });
    } catch {
      setStatus("error");
      setError("Signing was rejected in your wallet.");
      return;
    }

    setStatus("writing");

    try {
      const res = await fetch("/api/identity-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          address,
          chainId: CHAIN_ID,
          signature,
          message,
          ...(name ? { name } : {}),
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const parsedError = walletAttestationErrorSchema.safeParse(errorJson);
        throw new Error(parsedError.success ? parsedError.data.error : "Failed to link wallet");
      }

      const successJson = await res.json().catch(() => null);
      const parsedSuccess = walletAttestationSuccessSchema.safeParse(successJson);

      if (!parsedSuccess.success) {
        throw new Error("Identity-link route returned an invalid response");
      }

      setAttestationUri(parsedSuccess.data.uri);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to link wallet");
    }
  };

  return { status, error, attestationUri, linkWallet, reset };
}
