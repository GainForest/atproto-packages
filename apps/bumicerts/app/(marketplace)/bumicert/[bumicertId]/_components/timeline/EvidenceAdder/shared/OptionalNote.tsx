"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { useEvidenceAdderStore } from "./evidenceAdderStore";
import { useTranslations } from "next-intl";

const OptionalNote = ({
  disabled,
}: {
  disabled?: boolean;
}) => {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const description = useEvidenceAdderStore((state) => state.description);
  const setDescription = useEvidenceAdderStore((state) => state.setDescription);
  const auth = useAtprotoStore((state) => state.auth);
  const ownerDid = auth.user?.did;

  if (!ownerDid) {
    return (
      <div className="w-full text-center text-destructive">
        {t("authError")}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col w-full">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-[0.1em]">
        {t("optionalNote")}
      </p>
      <LeafletEditor
        content={description}
        onChange={setDescription}
        ownerDid={ownerDid}
        placeholder={t("optionalNotePlaceholder")}
        initialHeight={96}
        minHeight={72}
        maxHeight={280}
        disabled={disabled}
      />
    </div>
  );
};

export default OptionalNote;
