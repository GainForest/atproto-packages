"use client";
import React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  CalendarClockIcon,
  ClubIcon,
  HandHeartIcon,
  ImagePlusIcon,
} from "lucide-react";
import FileInput from "../../../../../../../components/ui/FileInput";
import FormField from "../../../../../../../components/ui/FormField";
import { useFormStore } from "../../form-store";
import Capsules from "../../../../../../../components/ui/Capsules";
import useNewBumicertStore from "../../store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarRange } from "@/components/ui/calendar-range";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BUMICERT_COVER_IMAGE_MAX_SIZE_MB,
  BUMICERT_COVER_IMAGE_SUPPORTED_TYPES,
} from "../../constants";
import { useTranslations } from "next-intl";
import { localizeFormError } from "../../i18n";

const Step1 = () => {
  const t = useTranslations("bumicert.create.draft");
  const { viewport, openState } = useNavbarContext();

  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const formValues = useFormStore((state) => state.formValues[0]);
  const errors = useFormStore((state) => state.formErrors[0]);
  const setFormValue = useFormStore((state) => state.setFormValue[0]);

  const { projectName, coverImage, workType, projectDateRange, isOngoing } = formValues;
  const [startDate, endDate] = projectDateRange;

  const handleOngoingChange = (checked: boolean) => {
    setFormValue("isOngoing", checked);
    // When toggling ongoing on, clear the end date; when off, restore today
    setFormValue(
      "projectDateRange",
      checked ? [startDate, null] : [startDate, new Date()]
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        {t("stepForms.cover.heading")}
      </h1>
      <div className="flex flex-col gap-2 mt-8">
        <div
          className={cn(
            "grid grid-cols-1 gap-2",
            viewport === "desktop" && openState.desktop
              ? "min-[52rem]:grid-cols-[16rem_1fr] lg:grid-cols-1 xl:grid-cols-[16rem_1fr]"
              : "lg:grid-cols-[16rem_1fr]"
          )}
        >
          <FormField
            Icon={ImagePlusIcon}
            label={t("stepForms.cover.coverImage.label")}
            error={localizeFormError(errors.coverImage, t)}
            showError={shouldShowValidationErrors}
            info={t("stepForms.cover.coverImage.info")}
            required
          >
            <FileInput
              className="h-80"
              placeholder={t("stepForms.cover.coverImage.placeholder")}
              value={coverImage}
              onFileChange={(file) =>
                setFormValue(
                  "coverImage",
                  file ?? new File([], "cover-image.png")
                )
              }
              supportedFileTypes={[
                ...BUMICERT_COVER_IMAGE_SUPPORTED_TYPES,
              ]}
              maxSizeInMB={BUMICERT_COVER_IMAGE_MAX_SIZE_MB}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <FormField
              Icon={ClubIcon}
              label={t("stepForms.cover.title.label")}
              error={localizeFormError(errors.projectName, t)}
              showError={shouldShowValidationErrors}
              info={t("stepForms.cover.title.info")}
              required
            >
              <InputGroup className="bg-background">
                <InputGroupInput
                  placeholder={t("stepForms.cover.title.placeholder")}
                  id="project-title"
                  value={projectName}
                  onChange={(e) => setFormValue("projectName", e.target.value)}
                />
                <InputGroupAddon
                  align="inline-end"
                  className={projectName.length > 50 ? "text-red-500" : ""}
                >
                  {projectName.length}/50
                </InputGroupAddon>
              </InputGroup>
            </FormField>
            <FormField
              Icon={CalendarClockIcon}
              label={t("stepForms.cover.dateRange.label")}
              className="flex-1"
              error={localizeFormError(errors.projectDateRange, t)}
              showError={shouldShowValidationErrors}
              required
              info={t("stepForms.cover.dateRange.info")}
            >
              <div className="mt-1 flex flex-col gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      id="project-date-range"
                      className="group w-full flex items-center justify-center text-center bg-foreground/2 transition-all duration-300 rounded-md cursor-pointer p-2"
                    >
                      <span
                        className={cn(
                          "text-foreground/20 group-hover:text-foreground/40 text-2xl font-medium",
                          "text-foreground group-hover:text-primary"
                        )}
                      >
                        {format(startDate, "LLL dd, y")} →{" "}
                        {isOngoing || endDate === null
                          ? t("stepForms.cover.dateRange.ongoing")
                          : format(endDate, "LLL dd, y")}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <CalendarRange
                      value={[startDate, endDate ?? new Date()]}
                      onValueChange={(value) => {
                        if (!value) return;
                        setFormValue("projectDateRange", [
                          value[0],
                          isOngoing ? null : value[1],
                        ]);
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* Ongoing checkbox */}
                <div className="flex items-center gap-2 px-1">
                  <Checkbox
                    id="is-ongoing"
                    checked={isOngoing}
                    onCheckedChange={(checked) =>
                      handleOngoingChange(checked === true)
                    }
                  />
                  <Label
                    htmlFor="is-ongoing"
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    {t("stepForms.cover.dateRange.ongoingCheckbox")}
                  </Label>
                </div>
              </div>
            </FormField>
            <FormField
              Icon={HandHeartIcon}
              label={t("stepForms.cover.workType.label")}
              className="flex-1"
              error={localizeFormError(errors.workType, t)}
              showError={shouldShowValidationErrors}
              required
              info={t("stepForms.cover.workType.info")}
            >
              <Capsules
                className="mt-1"
                selectMultiple={true}
                value={workType}
                onChange={(value) => setFormValue("workType", value)}
                options={[
                  { value: "Ecological Restoration", label: t("stepForms.cover.workType.options.ecologicalRestoration") },
                  { value: "Agroforestry", label: t("stepForms.cover.workType.options.agroforestry") },
                  { value: "Climate Adaptation", label: t("stepForms.cover.workType.options.climateAdaptation") },
                  { value: "Biodiversity Monitoring", label: t("stepForms.cover.workType.options.biodiversityMonitoring") },
                  { value: "Environmental Education", label: t("stepForms.cover.workType.options.environmentalEducation") },
                  { value: "Indigenous & Local Knowledge", label: t("stepForms.cover.workType.options.indigenousLocalKnowledge") },
                  { value: "Environmental Justice", label: t("stepForms.cover.workType.options.environmentalJustice") },
                ]}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1;
