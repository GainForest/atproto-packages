import { Button } from "@/components/ui/button";
import React from "react";
import { ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import CircularProgressBar from "@/components/circular-progressbar";
import z from "zod";
import { useTranslations } from "next-intl";
import { localizeFormError } from "../../../i18n";

const ReviewStepCard = <
  K extends string,
  T extends z.ZodObject<Record<K, z.ZodTypeAny>>,
>({
  title,
  percentage,
  onEdit,
  children,
  schema,
  errors,
  getFieldLabel,
}: {
  title: string;
  percentage?: number;
  onEdit?: () => void;
  children?: React.ReactNode;
  schema: T;
  errors: Partial<Record<K, string>>;
  getFieldLabel?: (key: K) => string;
}) => {
  const t = useTranslations("bumicert.create.draft.review");
  const validationT = useTranslations("bumicert.create.draft");
  const errorKeys = Object.keys(errors) as K[];
  const errorKeysWithRequired = errorKeys.filter(
    (key) => localizeFormError(errors[key], validationT) === validationT("validation.required")
  );
  const errorKeysWithoutRequired = errorKeys.filter(
    (key) => localizeFormError(errors[key], validationT) !== validationT("validation.required")
  );
  const hasErrors =
    errorKeysWithRequired.length > 0 || errorKeysWithoutRequired.length > 0;
  const getLabel = (key: K) => getFieldLabel?.(key) ?? schema.shape[key].description ?? key;

  return (
    <div className="rounded-xl border border-primary/10 shadow-lg overflow-hidden bg-primary/10 flex flex-col">
      <div className="flex items-center justify-between text-primary px-2 py-1">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {onEdit !== undefined && (
            <Button
              className="h-6 rounded-full -mr-1"
              variant={"ghost"}
              size={"sm"}
              onClick={onEdit}
            >
              {t("edit")}
              <ArrowRightIcon />
            </Button>
          )}
        </div>
      </div>

      <div className="bg-background flex-1 rounded-xl">
        <div className="m-2 flex flex-col bg-muted/50 rounded-lg shadow-sm">
          {hasErrors && (
            <div className="bg-red-500/5 rounded-lg p-2 border border-red-500/20 shadow-sm flex flex-col gap-1">
              {errorKeysWithRequired.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-destructive">
                    {t("missingFields")}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {errorKeysWithRequired.map((key) => (
                      <span
                        className="text-xs text-foreground bg-red-500/5 px-1.5 py-1 rounded-md"
                        key={key}
                      >
                        {getLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {errorKeysWithoutRequired.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-destructive">
                    {t("fieldsWithErrors")}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {errorKeysWithoutRequired.map((key) => (
                      <span
                        className="text-xs text-foreground bg-red-500/5 px-1.5 py-1 rounded-md"
                        key={key}
                      >
                        {getLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-2 gap-2">
            <span className="text-sm font-medium text-foreground">
              {hasErrors ? t("fixIssues") : t("allFieldsCorrect")}
            </span>
            <div className="flex items-center gap-1">
              {hasErrors && percentage !== undefined ? (
                <CircularProgressBar
                  size={28}
                  value={percentage}
                  text={`${percentage}%`}
                  textSize={0.4}
                />
              ) : (
                <CircleCheckIcon className="size-6 text-primary" />
              )}
              {hasErrors && (
                <Button
                  className="rounded-full"
                  variant={"outline"}
                  size={"sm"}
                  onClick={onEdit}
                >
                  {t("fix")}
                  <ArrowRightIcon />
                </Button>
              )}
            </div>
          </div>
        </div>
        {children && <div className="px-4 py-1 divide-y">{children}</div>}
      </div>
    </div>
  );
};

export default ReviewStepCard;
