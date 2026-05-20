"use client";
import React, { useState } from "react";
import FormField from "../../../../../../../components/ui/FormField";
import {
  HandHeartIcon,
  MessageCircleIcon,
  SparklesIcon,
  Loader2Icon,
} from "lucide-react";
import { useFormStore } from "../../form-store";
import useNewBumicertStore from "../../store";
import { Button } from "@/components/ui/button";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { BskyRichTextEditor } from "@/components/ui/bsky-richtext-editor";
import { useAtprotoStore } from "@/components/stores/atproto";
import { extractTextFromLinearDocument } from "@/lib/adapters";
import { links } from "@/lib/links";
import { useTranslations } from "next-intl";
import { localizeFormError } from "../../i18n";

const Step2 = () => {
  const t = useTranslations("bumicert.create.draft");
  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const formValues = useFormStore((state) => state.formValues[1]);
  const errors = useFormStore((state) => state.formErrors[1]);
  const setFormValue = useFormStore((state) => state.setFormValue[1]);

  // Step 1 values — needed for the AI prompt (title)
  const step1Values = useFormStore((state) => state.formValues[0]);

  const { description, shortDescription, shortDescriptionFacets } = formValues;

  const auth = useAtprotoStore((state) => state.auth);
  const ownerDid = auth.status === "AUTHENTICATED" ? auth.user.did : "";

  const [isGenerating, setIsGenerating] = useState(false);
  const shortDescriptionValue = {
    text: shortDescription,
    facets: shortDescriptionFacets,
  };
  const [shortDescriptionEditorVersion, setShortDescriptionEditorVersion] =
    useState(0);
  const shortDescriptionEditorKey = `short-description-editor-${shortDescriptionEditorVersion}`;

  const handleGenerateShortDescription = async () => {
    const descriptionText = extractTextFromLinearDocument(description).trim();
    if (!descriptionText) return;

    setIsGenerating(true);
    try {
      const res = await fetch(links.bumicert.api.generateShortDescription, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionText,
          title: step1Values.projectName ?? "",
        }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as {
        shortDescription?: string;
        success?: boolean;
      };
      if (data.success && data.shortDescription) {
        setFormValue("shortDescription", data.shortDescription);
        setShortDescriptionEditorVersion((version) => version + 1);
      }
    } catch {
      // Silently fail — user can just type manually
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate =
    extractTextFromLinearDocument(description).trim().length > 0 && !isGenerating;

  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        {t("stepForms.impact.heading")}
      </h1>
      <FormField
        Icon={HandHeartIcon}
        label={t("stepForms.impact.story.label")}
        className="mt-8"
        description={t("stepForms.impact.story.description")}
        error={localizeFormError(errors.description, t)}
        showError={shouldShowValidationErrors}
        required
        info={t("stepForms.impact.story.info")}
      >
        <div className="w-full bg-background rounded-md border border-border overflow-hidden">
          <LeafletEditor
            content={description}
            onChange={(doc) => setFormValue("description", doc)}
            ownerDid={ownerDid}
            placeholder={t("stepForms.impact.story.placeholder")}
            initialHeight={260}
            minHeight={200}
            maxHeight={560}
          />
        </div>
      </FormField>
      <FormField
        Icon={MessageCircleIcon}
        label={t("stepForms.impact.shortDescription.label")}
        className="mt-4"
        description={t("stepForms.impact.shortDescription.description")}
        error={localizeFormError(errors.shortDescription, t)}
        showError={shouldShowValidationErrors}
        inlineEndMessage={`${shortDescription.length}/3000`}
        required
        info={t("stepForms.impact.shortDescription.info")}
      >
        <div className="w-full relative">
          <div className="w-full rounded-md border border-border bg-background overflow-hidden pr-10">
            <BskyRichTextEditor
              key={shortDescriptionEditorKey}
              initialValue={shortDescriptionValue}
              onChange={(text, facets) => {
                setFormValue("shortDescription", text);
                setFormValue("shortDescriptionFacets", facets ?? []);
              }}
              placeholder={t("stepForms.impact.shortDescription.placeholder")}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canGenerate}
            onClick={handleGenerateShortDescription}
            className="rounded-full absolute right-2 bottom-2"
            title={
              canGenerate
                ? t("stepForms.impact.shortDescription.generateTitle")
                : t("stepForms.impact.shortDescription.generateDisabledTitle")
            }
          >
            {isGenerating ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon className="fill-current text-muted-foreground" />
            )}
          </Button>
        </div>
      </FormField>
    </div>
  );
};

export default Step2;
