import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TimelineMapLayer } from "./timelineMapLayers";
import { useTimelineViewerStore } from "./timelineViewerStore";

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
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
              isActive
                ? "border-primary/35 bg-primary/5"
                : "border-border/50 bg-muted/15",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {layer.title}
                </p>
                <Badge
                  variant={isActive ? "success" : "outline"}
                  className={cn(
                    !isActive &&
                      "border-muted-foreground/25 text-muted-foreground",
                  )}
                >
                  {isActive ? t("activeOnMap") : t("hiddenFromMap")}
                </Badge>
              </div>
              {layer.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {layer.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {isActive
                  ? t("visibleLayerDescription")
                  : t("hiddenLayerDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant={isActive ? "outline" : "secondary"}
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
              {isActive ? (
                <EyeOffIcon className="size-3" />
              ) : (
                <EyeIcon className="size-3" />
              )}
              {isActive ? t("hideLayer") : t("showLayer")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
