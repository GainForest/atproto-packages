import { MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimelineMapLayer } from "./timelineMapLayers";
import { useTimelineViewerStore } from "./timelineViewerStore";
import { useTranslations } from "next-intl";

interface TimelineDatasetMapLayerCardsProps {
  layers: TimelineMapLayer[];
}

export function TimelineDatasetMapLayerCards({
  layers,
}: TimelineDatasetMapLayerCardsProps) {
  const t = useTranslations("bumicert.detail.timelineEntry");
  const activeMapLayerByDatasetUri = useTimelineViewerStore(
    (state) => state.activeMapLayerByDatasetUri,
  );
  const setMapLayerActive = useTimelineViewerStore(
    (state) => state.setMapLayerActive,
  );

  if (layers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {t("treeDatasetMapLayers")}
      </p>
      {layers.map((layer) => {
        const isActive = Boolean(activeMapLayerByDatasetUri[layer.datasetUri]);

        return (
          <div
            key={layer.datasetUri}
            className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {layer.title}
              </p>
              {layer.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {layer.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              aria-pressed={isActive}
              aria-label={
                isActive
                  ? t("hideDatasetFromGreenGlobeMap", { title: layer.title })
                  : t("showDatasetOnGreenGlobeMap", { title: layer.title })
              }
              className="shrink-0"
              onClick={() => setMapLayerActive(layer.datasetUri, !isActive)}
            >
              <MapIcon className="size-3" />
              {isActive ? t("hideFromMap") : t("showOnMap")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
