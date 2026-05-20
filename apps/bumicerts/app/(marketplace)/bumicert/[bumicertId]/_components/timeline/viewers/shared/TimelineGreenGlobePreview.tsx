import { ExternalLinkIcon, Globe2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import type { TimelineMapLayer } from "./timelineMapLayers";
import { useTimelineViewerStore } from "./timelineViewerStore";
import { useTranslations } from "next-intl";

interface TimelineGreenGlobePreviewProps {
  organizationDid: string;
  layers: TimelineMapLayer[];
  isLoading: boolean;
}

export function TimelineGreenGlobePreview({
  organizationDid,
  layers,
  isLoading,
}: TimelineGreenGlobePreviewProps) {
  const t = useTranslations("bumicert.detail.timelineEntry");
  const activeMapLayerByDatasetUri = useTimelineViewerStore(
    (state) => state.activeMapLayerByDatasetUri,
  );
  const activeLayers = layers.filter(
    (layer) => activeMapLayerByDatasetUri[layer.datasetUri],
  );
  const href =
    activeLayers.length > 0
      ? links.external.greenGlobeTreePreview(organizationDid, {
          datasetRefs: activeLayers.map((layer) => layer.datasetUri),
        })
      : null;

  if (!isLoading && layers.length === 0) {
    return null;
  }

  return (
    <section className="sticky top-4 z-10 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-medium text-foreground">
            <Globe2Icon className="size-4 text-primary" />
            {t("greenGlobeMapTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? t("resolvingSpatialLayers")
              : activeLayers.length > 0
                ? t("activeLayerCount", { count: activeLayers.length })
                : t("showOnMapHint")}
          </p>
        </div>
        {href ? (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-3" />
              {t("openGreenGlobe")}
            </a>
          </Button>
        ) : null}
      </div>

      {activeLayers.length > 0 ? (
        <div className="space-y-3 p-3 md:p-4">
          <div className="flex flex-wrap gap-2">
            {activeLayers.map((layer) => (
              <span
                key={layer.datasetUri}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
              >
                {layer.title}
              </span>
            ))}
          </div>
          {href ? (
            <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10">
              <iframe
                title={t("greenGlobeIframeTitle")}
                src={href}
                className="h-[240px] w-full border-0 md:h-[360px]"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
