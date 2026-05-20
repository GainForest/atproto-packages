"use client";
import React from "react";
import ReviewStepCard from "./ReviewStepCard";
import useNewBumicertStore from "../../../store";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  useFormStore,
  type Step1FormValues,
  type Step3FormValues,
} from "../../../form-store";
import BumicertPreviewCard from "./BumicertPreviewCard";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const FormValue = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex-1 flex flex-col py-1">
    <span className="font-medium text-muted-foreground text-xs">{label}</span>
    {value}
  </div>
);

const formatReviewDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

const step1FieldLabelKeys: Record<keyof Step1FormValues, string> = {
  projectName: "cover.title.label",
  coverImage: "cover.coverImage.label",
  workType: "cover.workType.label",
  projectDateRange: "cover.dateRange.label",
  isOngoing: "cover.dateRange.ongoingCheckbox",
};

const step3FieldLabelKeys: Record<keyof Step3FormValues, string> = {
  contributors: "site.contributors.label",
  siteBoundaries: "site.boundaries.label",
  confirmPermissions: "site.permissions.label",
  agreeTnc: "site.permissions.terms",
};

const Step4 = () => {
  const t = useTranslations("bumicert.create.draft");
  const locale = useLocale();
  const { viewport, openState } = useNavbarContext();
  const { setCurrentStepIndex } = useNewBumicertStore();
  const completionPercentages = useFormStore(
    (state) => state.formCompletionPercentages
  );
  const step1Progress = completionPercentages[0];
  const step2Progress = completionPercentages[1];
  const step3Progress = completionPercentages[2];

  const formValues = useFormStore((state) => state.formValues);
  const step1FormValues = formValues[0];
  const step2FormValues = formValues[1];
  const step3FormValues = formValues[2];

  const formErrors = useFormStore((state) => state.formErrors);
  const step1Errors = formErrors[0];
  const step2Errors = formErrors[1];
  const step3Errors = formErrors[2];

  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        {t("review.heading")}
      </h1>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 mt-8",
          viewport === "desktop" && openState.desktop
            ? "grid-cols-1 min-[54rem]:grid-cols-2 lg:grid-cols-1 min-[74rem]:grid-cols-2"
            : "grid-cols-1"
        )}
      >
        <ReviewStepCard
          schema={step1Schema}
          errors={step1Errors}
          title={t("steps.cover.title")}
          percentage={step1Progress}
          onEdit={() => setCurrentStepIndex(0)}
          getFieldLabel={(key) => t(`stepForms.${step1FieldLabelKeys[key]}`)}
        >
          {Object.keys(step1FormValues).map((key) => {
            const typedKey = key as keyof typeof step1FormValues;
            const error = step1Errors[typedKey];
            if (error) return null;

            let parsedValue: string;
            switch (typedKey) {
              case "coverImage":
                parsedValue = step1FormValues[typedKey]
                  ? t("review.uploaded")
                  : t("review.notUploaded");
                break;
              case "projectDateRange": {
                const [start, end] = step1FormValues[typedKey];
                const endStr = step1FormValues.isOngoing || end === null
                  ? t("stepForms.cover.dateRange.ongoing")
                  : formatReviewDate(end, locale);
                parsedValue = t("review.dateRange", {
                  start: formatReviewDate(start, locale),
                  end: endStr,
                });
                break;
              }
              case "isOngoing":
                return null;
              case "workType":
                parsedValue =
                  step1FormValues[typedKey].join(", ") || t("review.notSelected");
                break;
              default:
                parsedValue = step1FormValues[typedKey];
            }
            return (
              <FormValue
                key={key}
                label={t(`stepForms.${step1FieldLabelKeys[typedKey]}`)}
                value={parsedValue}
              />
            );
          })}
        </ReviewStepCard>
        <ReviewStepCard
          schema={step2Schema}
          errors={step2Errors}
          title={t("steps.impact.title")}
          percentage={step2Progress}
          onEdit={() => setCurrentStepIndex(1)}
          getFieldLabel={(key) => t(`stepForms.impact.${key === "description" ? "story" : "shortDescription"}.label`)}
        >
          {step2Errors.description ? null : (
            <FormValue
              label={t("stepForms.impact.story.label")}
              value={
                <div className="flex items-center gap-1.5 mt-1 text-sm text-primary">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  <span>{t("review.impactStoryAdded")}</span>
                </div>
              }
            />
          )}
        </ReviewStepCard>
        <ReviewStepCard
          schema={step3Schema}
          errors={step3Errors}
          title={t("steps.site.title")}
          percentage={step3Progress}
          onEdit={() => setCurrentStepIndex(2)}
          getFieldLabel={(key) => t(`stepForms.${step3FieldLabelKeys[key]}`)}
        >
          {Object.keys(step3FormValues).map((key) => {
            const typedKey = key as keyof typeof step3FormValues;
            const error = step3Errors[typedKey];
            if (error) return null;

            let parsedValue: string;
            switch (typedKey) {
              case "contributors":
                parsedValue = step3FormValues[typedKey]
                  .map((c) => c.name)
                  .join(", ");
                break;
              case "siteBoundaries":
                parsedValue = t("review.sitesSelected", {
                  count: step3FormValues[typedKey].length,
                });
                break;
              case "confirmPermissions":
                parsedValue = step3FormValues[typedKey] ? t("review.yes") : t("review.no");
                break;
              case "agreeTnc":
                parsedValue = step3FormValues[typedKey] ? t("review.yes") : t("review.no");
                break;
              default:
                parsedValue = step3FormValues[typedKey];
            }
            return (
              <FormValue
                key={key}
                label={t(`stepForms.${step3FieldLabelKeys[typedKey]}`)}
                value={parsedValue}
              />
            );
          })}
        </ReviewStepCard>
        <BumicertPreviewCard />
      </div>
    </div>
  );
};

export default Step4;
