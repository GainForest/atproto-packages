/**
 * EIP-3009 server-side helpers.
 *
 * Handles:
 *  1. Building the typed-data payload for the frontend to sign
 *  2. Parsing the PAYMENT-SIGNATURE header from /api/fund
 *  3. Splitting a compact 65-byte signature into (v, r, s) components
 */

import { hexToNumber, slice } from "viem";
import { z } from "zod";
import { CHAIN_ID, EIP3009_DOMAIN_NAME, EIP3009_DOMAIN_VERSION, EIP3009_TYPES, USDC_CONTRACT } from "./usdc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Eip3009Authorization = {
  from:        `0x${string}`;
  to:          `0x${string}`;
  value:       string;   // decimal string of the uint256 (6 decimals)
  validAfter:  string;   // "0"
  validBefore: string;   // unix timestamp string
  nonce:       `0x${string}`;
};

export type PaymentSignaturePayload = {
  x402Version: number;
  scheme: string;
  networkId: string;
  payload: {
    signature: `0x${string}`;
    authorization: Eip3009Authorization;
  };
};

const hexAddressSchema = z.custom<`0x${string}`>(
  (value): value is `0x${string}` =>
    typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value),
  "Expected an EVM address.",
);

const hexStringSchema = z.custom<`0x${string}`>(
  (value): value is `0x${string}` =>
    typeof value === "string" && /^0x[a-fA-F0-9]+$/.test(value),
  "Expected a hex string.",
);

const eip3009AuthorizationSchema: z.ZodType<Eip3009Authorization> = z.object({
  from: hexAddressSchema,
  to: hexAddressSchema,
  value: z.string().regex(/^\d+$/, "Authorization value must be a decimal string."),
  validAfter: z.string().regex(/^\d+$/, "validAfter must be a unix timestamp string."),
  validBefore: z.string().regex(/^\d+$/, "validBefore must be a unix timestamp string."),
  nonce: hexStringSchema,
});

const paymentSignaturePayloadSchema: z.ZodType<PaymentSignaturePayload> = z.object({
  x402Version: z.number().int(),
  scheme: z.string().min(1),
  networkId: z.string().min(1),
  payload: z.object({
    signature: hexStringSchema,
    authorization: eip3009AuthorizationSchema,
  }),
});

// ---------------------------------------------------------------------------
// EIP-3009 typed-data domain (same as what the frontend signs)
// ---------------------------------------------------------------------------

export function buildEip3009Domain() {
  return {
    name:              EIP3009_DOMAIN_NAME,
    version:           EIP3009_DOMAIN_VERSION,
    chainId:           CHAIN_ID,
    verifyingContract: USDC_CONTRACT,
  } as const;
}

export function buildEip3009TypedData(authorization: Eip3009Authorization) {
  return {
    domain:      buildEip3009Domain(),
    types:       EIP3009_TYPES,
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from:        authorization.from,
      to:          authorization.to,
      value:       BigInt(authorization.value),
      validAfter:  BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce:       authorization.nonce as `0x${string}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Parse PAYMENT-SIGNATURE header
// ---------------------------------------------------------------------------

export function parsePaymentSignature(header: string): PaymentSignaturePayload {
  let parsedJson: unknown;

  try {
    const json = Buffer.from(header, "base64").toString("utf-8");
    parsedJson = JSON.parse(json);
  } catch {
    throw new Error("PAYMENT-SIGNATURE is not valid base64 JSON.");
  }

  const parsed = paymentSignaturePayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid PAYMENT-SIGNATURE payload.");
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// Split compact 65-byte sig into (v, r, s)
// ---------------------------------------------------------------------------

export type VRS = { v: number; r: `0x${string}`; s: `0x${string}` };

export function splitSignature(sig: `0x${string}`): VRS {
  // sig = 0x + 64 hex chars (r) + 64 hex chars (s) + 2 hex chars (v)
  const r = slice(sig, 0, 32) as `0x${string}`;
  const s = slice(sig, 32, 64) as `0x${string}`;
  const vHex = slice(sig, 64, 65) as `0x${string}`;
  let v = hexToNumber(vHex);
  // Normalise legacy v values (0/1 → 27/28)
  if (v < 27) v += 27;
  return { v, r, s };
}
