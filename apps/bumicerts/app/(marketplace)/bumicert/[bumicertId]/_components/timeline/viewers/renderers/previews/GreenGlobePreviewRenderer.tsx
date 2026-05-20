import { ExternalLinkIcon } from "lucide-react";
import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";
import { useTranslations } from "next-intl";

interface GreenGlobePreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function GreenGlobePreviewRenderer({
  preview,
}: GreenGlobePreviewRendererProps) {
  const t = useTranslations("bumicert.detail.timelineEntry");

  if (preview.kind !== "green-globe") {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-sm text-muted-foreground">
      <p>{t("sharedGreenGlobePreviewHint")}</p>
      <a
        href={preview.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 text-foreground hover:text-primary"
      >
        {t("openGreenGlobe")}
        <ExternalLinkIcon className="h-4 w-4" />
      </a>
    </div>
  );
}
