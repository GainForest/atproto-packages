"use client";

import type { BumicertData, FundingConfigData } from "@/lib/types";
import { useTabParam } from "../_hooks/useTabParam";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { BumicertTabs } from "./BumicertMobileTabs";
import { BumicertSidebar } from "./BumicertSidebar";
import { TabContent } from "./TabContent";
import {
  BumicertCreationMeta,
  BumicertMeta,
  BumicertTitleMeta,
} from "./BumicertInfoBar";
import { PublicDonateArea } from "./donate/PublicDonateArea";
import { FundingStatus, computeWalletFlags } from "./FundingStatus";
import { useEvmLinks } from "@/hooks/useEvmLinks";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import DeleteBumicertModal, {
  DeleteBumicertModalId,
} from "./DeleteBumicertModal";
import { BumicertPreview } from "./BumicertPreview";
import { useTranslations } from "next-intl";

interface BumicertDetailProps {
  bumicert: BumicertData;
  /** True when the authenticated user owns this bumicert */
  isOwner: boolean;
  /** Funding config for this bumicert (null if not yet created) */
  fundingConfig: FundingConfigData | null;
}

// ── Mobile donate slot ────────────────────────────────────────────────────────
// Mirrors the sidebar's donate area but rendered inline in the mobile stack.

function MobileDonateSlot({
  bumicert,
  isOwner,
  fundingConfig,
}: BumicertDetailProps) {
  const queryClient = useQueryClient();
  const { data: evmLinks = [] } = useEvmLinks(
    isOwner ? bumicert.organizationDid : undefined,
  );
  const { valid: receivingWalletValid, trusted: receivingWalletTrusted } =
    isOwner
      ? computeWalletFlags(fundingConfig, evmLinks)
      : { valid: false, trusted: false };

  const handleConfigSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  if (isOwner) {
    return (
      <FundingStatus
        ownerDid={bumicert.organizationDid}
        bumicertRkey={bumicert.rkey}
        fundingConfig={fundingConfig}
        receivingWalletValid={receivingWalletValid}
        receivingWalletTrusted={receivingWalletTrusted}
        onConfigSaved={handleConfigSaved}
      />
    );
  }

  return <PublicDonateArea bumicert={bumicert} fundingConfig={fundingConfig} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BumicertDetail({
  bumicert,
  isOwner,
  fundingConfig,
}: BumicertDetailProps) {
  const t = useTranslations("bumicert.detail");
  const [tab] = useTabParam();
  const hasCoverImage = Boolean(bumicert.coverImageUrl);
  const isOverviewTab = tab === "overview";
  const showSidebar = tab !== "timeline";
  const { pushModal, show } = useModal();

  const handleDeleteClick = () => {
    pushModal(
      {
        id: DeleteBumicertModalId,
        content: (
          <DeleteBumicertModal rkey={bumicert.rkey} title={bumicert.title} />
        ),
      },
      true,
    );
    show();
  };

  return (
    <>
      <HeaderContent sub={<BumicertTabs />} />

      <div
        className={`grid grid-cols-1 gap-6 lg:gap-10 lg:px-2 ${showSidebar ? "lg:grid-cols-[280px_1fr]" : ""}`}
      >
        {/* Sidebar — hidden on Timeline tab */}
        {showSidebar && (
          <div className="hidden lg:block">
            <BumicertSidebar
              bumicert={bumicert}
              isOwner={isOwner}
              fundingConfig={fundingConfig}
            />
          </div>
        )}

        {/* Right column: mobile meta stack + tab content */}
        <div className="flex flex-col gap-4">
          {/* Mobile-only stack — hidden at lg+ */}
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="sticky top-28 z-10 border border-border rounded-3xl shadow-md bg-background/75 backdrop-blur-xl px-4 py-3">
              {isOverviewTab ? (
                <BumicertCreationMeta bumicert={bumicert} />
              ) : (
                <BumicertTitleMeta bumicert={bumicert} />
              )}
            </div>

            {isOverviewTab ? (
              <div
                className={
                  hasCoverImage
                    ? "flex flex-col gap-2 sm:flex-row"
                    : "flex flex-col gap-2"
                }
              >
                <BumicertPreview
                  bumicert={bumicert}
                  className={hasCoverImage ? "w-full sm:w-1/2" : "w-full"}
                />
                <div
                  className={
                    hasCoverImage
                      ? "flex flex-col gap-4 sm:w-1/2 sm:flex-1"
                      : "flex flex-col gap-4"
                  }
                >
                  <BumicertMeta bumicert={bumicert} />
                  <MobileDonateSlot
                    bumicert={bumicert}
                    isOwner={isOwner}
                    fundingConfig={fundingConfig}
                  />
                  {isOwner ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDeleteClick}
                    >
                      <Trash2Icon className="h-4 w-4" />
                      {t("actions.deleteBumicert")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Tab content */}
          <TabContent bumicert={bumicert} isOwner={isOwner} />
        </div>
      </div>
    </>
  );
}
