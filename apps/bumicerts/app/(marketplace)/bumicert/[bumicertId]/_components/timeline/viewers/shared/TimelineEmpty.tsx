import { ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function TimelineEmpty() {
  const t = useTranslations("bumicert.detail.timeline");
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <ClockIcon className="h-9 w-9 opacity-30" />
      <p className="text-sm font-medium">{t("emptyTitle")}</p>
      <p className="text-xs max-w-xs leading-relaxed">
        {t("emptyDescription")}
      </p>
    </div>
  );
}
