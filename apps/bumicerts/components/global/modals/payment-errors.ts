export type PaymentErrorKey =
  | "walletNotConnected"
  | "invalidRecipientWallet"
  | "facilitatorWalletNotConfigured"
  | "signatureRejected"
  | "invalidResponse"
  | "paymentFailed"
  | "invalidRequest"
  | "identityRequired"
  | "invalidSignature"
  | "recipientNoWallet"
  | "recipientMismatch"
  | "onchainFailed"
  | "authorizationFacilitatorMismatch"
  | "amountMismatch"
  | "itemAmountsMismatch"
  | "missingOrgWallets"
  | "fundsReceiveFailed"
  | "activityCidFailed";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const codeToKey: Record<string, PaymentErrorKey> = {
  NON_ANONYMOUS_DONATION_REQUIRES_DONOR_DID: "identityRequired",
};

const messageToKey: ReadonlyArray<[string, PaymentErrorKey]> = [
  ["Invalid request body", "invalidRequest"],
  ["Invalid PAYMENT-SIGNATURE header", "invalidSignature"],
  ["PAYMENT-SIGNATURE header is required", "invalidSignature"],
  ["Recipient has no linked wallet", "recipientNoWallet"],
  ["Authorization recipient does not match organization wallet", "recipientMismatch"],
  ["On-chain transfer failed", "onchainFailed"],
  ["Facilitator wallet address not configured", "facilitatorWalletNotConfigured"],
  ["Authorization must be to the facilitator wallet", "authorizationFacilitatorMismatch"],
  ["Authorization amount", "amountMismatch"],
  ["Item amounts must sum to totalAmount", "itemAmountsMismatch"],
  ["Some organizations have no linked wallet", "missingOrgWallets"],
  ["Failed to receive funds from donor", "fundsReceiveFailed"],
  ["Failed to resolve activity CIDs", "activityCidFailed"],
];

export function paymentErrorKeyFromResponse(value: unknown): PaymentErrorKey {
  if (!isRecord(value)) return "paymentFailed";

  const code = value.code;
  if (typeof code === "string") {
    const key = codeToKey[code];
    if (key) return key;
  }

  const error = value.error;
  if (typeof error !== "string") return "paymentFailed";

  const match = messageToKey.find(([message]) => error.includes(message));
  return match?.[1] ?? "paymentFailed";
}
