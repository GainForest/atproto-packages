"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, EyeIcon, LightbulbIcon } from "lucide-react";
import useNewBumicertStore from "../store";
import { BumicertCardVisual } from "@/components/bumicert/BumicertCard";
import { useFormStore } from "../form-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentAccountIdentity } from "@/hooks/use-current-account-identity";
import { useTranslations } from "next-intl";
import { getStringArray } from "../i18n";

const previewBumicertByDefaultByStep = [true, false, false, false, false];

const EMPTY_COVER_IMAGE = new File([], "cover-image.png");

const SecondaryContent = () => {
  const t = useTranslations("bumicert.create.draft");
  const { currentStepIndex: currentStep } = useNewBumicertStore();
  const stepKey = ["cover", "impact", "site", "review", "submit"][currentStep] ?? "cover";
  const tips = getStringArray(t.raw(`steps.${stepKey}.tips.bullets`));
  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1FormValues = useFormStore((state) => state.formValues[0]);
  const step2FormValues = useFormStore((state) => state.formValues[1]);
  const step1Progress = completionPercentages[0];
  const {
    displayName: organizationName,
    logoUrl,
    query,
  } = useCurrentAccountIdentity();
  const isLoadingOrganizationInfo = query.isLoading;

  const [isBumicertPreviewOpen, setIsBumicertPreviewOpen] = useState(
    previewBumicertByDefaultByStep[currentStep] ?? false
  );

  return (
    <div className="w-full min-h-full flex flex-col bg-muted/50 rounded-xl">
      <div className="w-full p-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-lg font-medium text-muted-foreground">
            <EyeIcon className="size-5" />
            {t("sidebar.previewTitle")}
          </span>
          <Button
            size={"icon"}
            variant={"ghost"}
            onClick={() => setIsBumicertPreviewOpen(prev => !prev)}
          >
            <ChevronDownIcon
              className={cn(
                "size-5 transition-transform duration-200",
                isBumicertPreviewOpen ? "rotate-180" : ""
              )}
            />
          </Button>
        </div>
        <hr className="my-2" />
        <AnimatePresence mode="wait">
          {isBumicertPreviewOpen && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.3,
                filter: "blur(10px)",
                height: 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
                height: "auto",
              }}
              exit={{ opacity: 0, scale: 0.3, filter: "blur(10px)", height: 0 }}
            >
              {step1Progress === 100 ? (
                <div className="w-full flex items-center justify-center">
                  <div className="w-full max-w-2xs aspect-3/4">
                    <BumicertCardVisual
                      logoUrl={logoUrl}
                      coverImage={
                        step1FormValues.coverImage ??
                        EMPTY_COVER_IMAGE
                      }
                      title={step1FormValues.projectName}
                      description={
                        step2FormValues.shortDescription.length > 0
                          ? step2FormValues.shortDescription
                          : undefined
                      }
                      organizationName={organizationName}
                      objectives={step1FormValues.workType}
                      className="h-full"
                    />
                  </div>
                </div>
              ) : isLoadingOrganizationInfo ? (
                <div className="w-full flex items-center justify-center p-4">
                  <span className="font-medium text-muted-foreground text-center text-pretty">
                    {t("sidebar.generatingPreview")}
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center p-4">
                  <span className="font-medium text-muted-foreground text-center text-pretty">
                    {t("sidebar.completeFirstStep")}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="w-full p-2">
        <span className="flex items-center gap-1 text-lg font-medium text-muted-foreground">
          <LightbulbIcon className="size-5" />
          {t("sidebar.tipsTitle")}
        </span>
        <hr className="my-2" />
        <ul className="list-disc list-inside -indent-5 pl-5 mt-2 font-medium text-muted-foreground">
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SecondaryContent;
