"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useAccount, useSignTypedData } from "wagmi";
import { useAtprotoStore } from "@/components/stores/atproto";
import type { BumicertData } from "@/lib/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { useUSDCBalance } from "./hooks/useUSDCBalance";
import { SuccessModal } from "./success";
import { toUsdcUnits, EIP3009_TYPES, CHAIN_ID, USDC_CONTRACT } from "@/lib/facilitator/usdc";
import { paymentErrorKeyFromResponse } from "@/components/global/modals/payment-errors";
import { useTranslations } from "next-intl";

type TxState = "idle" | "waiting-signature" | "processing" | "rejected";

interface ConfirmModalProps {
  bumicert: BumicertData;
  amount: number;
  donorChoseAnonymous: boolean;
  recipientWallet: string;
}

type HexAddress = `0x${string}`;
type FundResponse = {
  success: boolean;
  transactionHash: string;
  receiptUri: string | null;
  donorRecordedAs: "did" | "wallet";
};

function isHexAddress(value: string): value is HexAddress {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isHexBytes32(value: string): value is HexAddress {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function createNonce(errorMessage: string): HexAddress {
  const nonce = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;

  if (!isHexBytes32(nonce)) {
    throw new Error(errorMessage);
  }

  return nonce;
}

function buildTypedData(params: {
  senderWallet: HexAddress;
  recipientWallet: HexAddress;
  usdcAmount: bigint;
  nonceErrorMessage: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const nonce = createNonce(params.nonceErrorMessage);

  return {
    domain: {
      name: "USD Coin",
      version: "2",
      chainId: CHAIN_ID,
      verifyingContract: USDC_CONTRACT,
    },
    types: EIP3009_TYPES,
    message: {
      from: params.senderWallet,
      to: params.recipientWallet,
      value: params.usdcAmount,
      validAfter: BigInt(0),
      validBefore: BigInt(now + 300),
      nonce,
    },
    authorization: {
      from: params.senderWallet,
      to: params.recipientWallet,
      value: params.usdcAmount.toString(),
      validAfter: "0",
      validBefore: String(now + 300),
      nonce,
    },
  };
}

function parseFundResponse(value: unknown): FundResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const success = Reflect.get(value, "success");
  const transactionHash = Reflect.get(value, "transactionHash");
  const receiptUri = Reflect.get(value, "receiptUri");
  const donorRecordedAs = Reflect.get(value, "donorRecordedAs");

  if (typeof success !== "boolean") return null;
  if (typeof transactionHash !== "string") return null;
  if (receiptUri !== null && typeof receiptUri !== "string") return null;
  if (donorRecordedAs !== "did" && donorRecordedAs !== "wallet") return null;

  return {
    success,
    transactionHash,
    receiptUri,
    donorRecordedAs,
  };
}

export function ConfirmModal({
  bumicert,
  amount,
  donorChoseAnonymous,
  recipientWallet,
}: ConfirmModalProps) {
  const t = useTranslations("modals.donate.confirm");
  const tErrors = useTranslations("modals.errors");
  const { pushModal, popModal, hide, clear } = useModal();
  const { address } = useAccount();
  const auth = useAtprotoStore((state) => state.auth);
  const { balance, isLoading: isBalanceLoading } = useUSDCBalance(address);

  const [txState, setTxState] = useState<TxState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { signTypedDataAsync } = useSignTypedData();

  const donorDid = auth.authenticated ? auth.user.did : undefined;
  const storeDonationAsAnonymous = donorDid ? donorChoseAnonymous : true;

  const usdcAmount = toUsdcUnits(amount);
  const hasEnoughBalance = balance !== null && parseFloat(balance) >= amount;

  const handleBack = () => {
    popModal();
  };

  const handleCancel = async () => {
    await hide();
    clear();
  };

  const handlePay = async () => {
    if (!address) {
      setErrorMsg(tErrors("walletNotConnected"));
      setTxState("rejected");
      return;
    }

    if (!isHexAddress(recipientWallet)) {
      setErrorMsg(tErrors("invalidRecipientWallet"));
      setTxState("rejected");
      return;
    }

    let typedData: ReturnType<typeof buildTypedData>;
    try {
      typedData = buildTypedData({
        senderWallet: address,
        recipientWallet,
        usdcAmount,
        nonceErrorMessage: tErrors("nonceGenerationFailed"),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : tErrors("paymentFailed"),
      );
      setTxState("rejected");
      return;
    }

    const { domain, types, message, authorization } = typedData;

    setTxState("waiting-signature");
    setErrorMsg(null);

    let signature: `0x${string}`;
    try {
        signature = await signTypedDataAsync({
          domain,
          types,
          primaryType: "TransferWithAuthorization",
          message,
        });
    } catch {
      setTxState("rejected");
      return;
    }

    setTxState("processing");

    const sigPayload = {
      x402Version: 2,
      scheme: "exact",
      networkId: "eip155:8453",
      payload: { signature, authorization },
    };
    const sigHeader = Buffer.from(JSON.stringify(sigPayload)).toString(
      "base64",
    );

    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": sigHeader,
        },
        body: JSON.stringify({
          activityUri: `at://${bumicert.organizationDid}/org.hypercerts.claim.activity/${bumicert.rkey}`,
          orgDid: bumicert.organizationDid,
          amount: String(amount),
          currency: "USDC",
          donorDid: storeDonationAsAnonymous ? undefined : donorDid,
          anonymous: storeDonationAsAnonymous,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(tErrors(paymentErrorKeyFromResponse(err)));
      }

      const rawData = await res.json();
      const data = parseFundResponse(rawData);
      if (!data) {
        throw new Error(tErrors("invalidResponse"));
      }

      pushModal({
        id: MODAL_IDS.DONATE_SUCCESS,
        content: (
          <SuccessModal
            amount={amount}
            organizationName={bumicert.organizationName}
            transactionHash={data.transactionHash}
            bumicertId={`${bumicert.organizationDid}-${bumicert.rkey}`}
            donorRecordedAs={data.donorRecordedAs}
          />
        ),
      });
    } catch (err) {
      console.error("[ConfirmModal] Payment failed:", err);
      setErrorMsg(
        err instanceof Error ? err.message : tErrors("paymentFailed"),
      );
      setTxState("rejected");
    }
  };

  if (txState === "waiting-signature") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader>
          <ModalTitle>{t("waitingTitle")}</ModalTitle>
          <ModalDescription className="sr-only">
            {t("waitingDescription")}
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="font-medium">
            {t("signTransaction")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("authorizes", {
              amount: amount.toFixed(2),
              organizationName: bumicert.organizationName,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("noGas")}
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full"
            disabled
          >
            {t("cancel")}
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  if (txState === "processing") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader>
          <ModalTitle>{t("processingTitle")}</ModalTitle>
          <ModalDescription className="sr-only">
            {t("processingDescription")}
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="font-medium">
            {t("confirmingOnBase")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("usuallySeconds")}
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full"
            disabled
          >
            {t("cancel")}
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  if (txState === "rejected") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader>
          <ModalTitle>{t("rejectedTitle")}</ModalTitle>
          <ModalDescription className="sr-only">
            {t("rejectedDescription")}
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="text-4xl">✕</span>
          <p className="font-medium">
            {t("rejectedInWallet")}
          </p>
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        </div>
        <ModalFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleBack}>
            {t("cancel")}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              setTxState("idle");
              setErrorMsg(null);
            }}
          >
            {t("tryAgain")}
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  // idle
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={handleBack}>
        <ModalTitle>{t("title")}</ModalTitle>
        <ModalDescription className="sr-only">
          {t("description")}
        </ModalDescription>
      </ModalHeader>

      <div className="border border-border rounded-lg px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1">{t("yourWallet")}</p>
        <p className="font-mono font-medium">{shortAddress}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("balanceLabel")}{" "}
          {isBalanceLoading
            ? t("loading")
            : balance !== null
              ? t("balanceOnBase", { balance })
              : t("unableToLoad")}
        </p>
      </div>

      <div className="border border-border rounded-lg px-4 py-3 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{t("donatingLabel")}</p>
        <p className="text-xl font-bold">${amount.toFixed(2)} USDC</p>
        <p className="text-sm text-muted-foreground">
          → {bumicert.organizationName}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("forBumicert", { title: bumicert.title })}
        </p>
      </div>

      {!isBalanceLoading && balance !== null && !hasEnoughBalance && (
        <p className="text-sm text-destructive font-medium">
          {t("insufficientBalance")}
        </p>
      )}

      <ModalFooter className="flex flex-col gap-2">
        <Button
          className="w-full"
          onClick={handlePay}
          disabled={!hasEnoughBalance || isBalanceLoading}
        >
          {t("pay", { amount: amount.toFixed(2) })}
        </Button>
        <Button variant="outline" onClick={handleCancel} className="w-full">
          {t("cancel")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
