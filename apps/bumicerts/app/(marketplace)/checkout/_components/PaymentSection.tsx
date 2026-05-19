"use client";

import { Button } from "@/components/ui/button";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { CHAIN_ID } from "@/lib/facilitator/usdc";
import { useUSDCBalance } from "@/components/global/modals/donate/hooks/useUSDCBalance";
import type { CheckoutState } from "./hooks/useCheckoutFlow";
import { useTranslations } from "next-intl";

interface PaymentSectionProps {
  totalAmount: number;
  state: CheckoutState;
  onPay: () => void;
  disabled?: boolean;
}

export function PaymentSection({
  totalAmount,
  state,
  onPay,
  disabled = false,
}: PaymentSectionProps) {
  const t = useTranslations("modals.checkout.payment");
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { balance, isLoading: isBalanceLoading } = useUSDCBalance(address);

  const isCorrectNetwork = chainId === CHAIN_ID;
  const hasEnoughBalance =
    balance !== null && parseFloat(balance) >= totalAmount;

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // Not connected
  if (!isConnected) {
    return (
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
            {t("title")}
          </span>
        </div>
        <div className="px-4 py-8 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {t("connectDescription")}
          </p>
          <Button onClick={openConnectModal} className="rounded-full px-6">
            {t("connectWallet")}
          </Button>
        </div>
      </div>
    );
  }

  // Wrong network
  if (!isCorrectNetwork) {
    return (
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
            {t("title")}
          </span>
        </div>
        <div className="px-4 py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.rich("switchDescription", {
              base: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
          <Button
            onClick={() => switchChain({ chainId: base.id })}
            disabled={isSwitching}
            className="rounded-full px-6"
          >
            {isSwitching ? t("switching") : t("switchToBase")}
          </Button>
        </div>
      </div>
    );
  }

  // Signing state
  if (state === "signing") {
    return (
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
            {t("title")}
          </span>
        </div>
        <div className="px-4 py-10 flex flex-col items-center gap-5 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="font-medium">{t("signTransaction")}</p>
            <p className="text-sm text-muted-foreground">
              {t("authorizes", { amount: totalAmount.toFixed(2) })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("noGas")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (state === "processing") {
    return (
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
            {t("title")}
          </span>
        </div>
        <div className="px-4 py-10 flex flex-col items-center gap-5 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <div className="space-y-1">
            <p className="font-medium">{t("processing")}</p>
            <p className="text-sm text-muted-foreground">
              {t("confirmingOnBase")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("usuallySeconds")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected + correct network
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground font-medium">
          {t("title")}
        </span>
      </div>
      <div className="px-4 py-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("wallet")}</p>
            <p className="font-mono text-sm mt-0.5">{shortAddress}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("balance")}</p>
            <p className="text-sm font-medium mt-0.5">
              {isBalanceLoading
                ? t("loading")
                : balance !== null
                  ? t("balanceAmount", { balance })
                  : t("unableToLoad")}
            </p>
          </div>
        </div>

        {!isBalanceLoading && balance !== null && !hasEnoughBalance && (
          <p className="text-sm text-destructive">
            {t("insufficientBalance")}
          </p>
        )}

        <Button
          className="w-full rounded-full h-12 text-base"
          onClick={onPay}
          disabled={
            disabled ||
            !hasEnoughBalance ||
            isBalanceLoading ||
            totalAmount <= 0
          }
        >
          {t("pay", { amount: totalAmount.toFixed(2) })}
        </Button>
      </div>
    </div>
  );
}
