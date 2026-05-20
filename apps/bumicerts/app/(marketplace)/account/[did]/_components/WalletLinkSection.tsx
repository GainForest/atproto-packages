"use client";

/**
 * WalletLinkSection — shown on the organization settings/profile page.
 *
 * Allows an org admin to link their EVM wallet address to their ATProto DID.
 * Once linked, the org can receive donations via the donation flow.
 *
 * Flow:
 * 1. Connect wallet via RainbowKit ConnectButton
 * 2. Switch to Base (if on wrong network)
 * 3. Sign EIP-712 message to prove wallet ownership
 * 4. POST /api/identity-link → writes org.impactindexer.link.attestation
 */

import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useWalletAttestation } from "@/hooks/useWalletAttestation";
import { useRecipientVerify } from "@/components/global/modals/donate/hooks/useRecipientVerify";
import { useAtprotoStore } from "@/components/stores/atproto";

interface WalletLinkSectionProps {
  /** The organization's ATProto DID */
  orgDid: string;
}

export function WalletLinkSection({ orgDid }: WalletLinkSectionProps) {
  const t = useTranslations("marketplace.account.wallet");
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const auth = useAtprotoStore((state) => state.auth);

  const isCorrectNetwork = chainId === base.id;

  const {
    data: recipientStatus,
    isLoading: isVerifying,
    refetch,
  } = useRecipientVerify(orgDid);

  const { status, error, linkWallet, reset } = useWalletAttestation();

  const isAuthenticated = auth.status === "AUTHENTICATED";

  if (!isAuthenticated) {
    return (
      <div className="border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-2">{t("setUpDonations")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("signInDescription")}
        </p>
      </div>
    );
  }

  // Already linked
  if (!isVerifying && recipientStatus?.hasAttestation) {
    return (
      <div className="border border-border rounded-xl p-6 flex flex-col gap-3">
        <h3 className="font-semibold">{t("enabled")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("walletLabel")}
          <span className="font-mono">
            {recipientStatus.address.slice(0, 6)}...
            {recipientStatus.address.slice(-4)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {t("enabledDescription")}
        </p>
      </div>
    );
  }

  // Not yet linked — show setup card
  return (
    <div className="border border-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="font-semibold">{t("setUpDonations")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("setupDescription")}
        </p>
      </div>

      {/* Step 1: Connect */}
      {!isConnected && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("stepConnect")}</p>
          <ConnectButton label={t("connectWallet")} showBalance={false} />
        </div>
      )}

      {/* Step 2: Switch network */}
      {isConnected && !isCorrectNetwork && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("stepSwitch")}</p>
          <Button
            onClick={() => switchChain({ chainId: base.id })}
            disabled={isSwitching}
          >
            {isSwitching ? t("switching") : t("switchToBase")}
          </Button>
        </div>
      )}

      {/* Step 3: Sign + link */}
      {isConnected && isCorrectNetwork && (
        <div className="flex flex-col gap-2">
          {status === "success" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                {t("linkedSuccess")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("linkedSuccessDescription")}
              </p>
              <Button variant="outline" size="sm" onClick={() => { reset(); refetch(); }}>
                {t("refresh")}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">
                {status === "idle"
                  ? t("stepLink")
                  : status === "signing"
                    ? t("waitingSignature")
                    : status === "writing"
                      ? t("writingAttestation")
                      : t("errorLinking")}
              </p>
              {address && (
                <p className="text-xs text-muted-foreground font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <Button
                onClick={() => linkWallet()}
                disabled={status === "signing" || status === "writing"}
              >
                {status === "signing"
                  ? t("signInWallet")
                  : status === "writing"
                    ? t("writingToAtproto")
                    : status === "error"
                      ? t("retry")
                      : t("signAndLink")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
