"use client";

import Link from "next/link";
import { ExternalLink, Globe2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

const GREEN_GLOBE_PREVIEW_FOCUS_MESSAGE_TYPE =
  "gainforest.greenGlobePreview.focusTree";

type GreenGlobeTreePreviewCardProps = {
  did: string;
  datasetRef: string;
  datasetName?: string | null;
  datasetTreeCount?: number | null;
  treeUri?: string | null;
  treeName?: string | null;
};

export function GreenGlobeTreePreviewCard({
  did,
  datasetRef,
  datasetName,
  datasetTreeCount,
  treeUri,
  treeName,
}: GreenGlobeTreePreviewCardProps) {
  const datasetPreviewUrl = links.external.greenGlobeTreePreview(did, {
    datasetRef,
  });
  const focusedDatasetPreviewUrl = treeUri
    ? links.external.greenGlobeTreePreview(did, {
        treeUri,
        datasetRef,
      })
    : datasetPreviewUrl;
  const datasetLabel = datasetName?.trim() || "selected dataset";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const targetOrigin = useMemo(() => {
    try {
      return new URL(datasetPreviewUrl).origin;
    } catch {
      return "*";
    }
  }, [datasetPreviewUrl]);
  const postPreviewFocusMessage = useCallback(() => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) {
      return;
    }

    targetWindow.postMessage(
      {
        type: GREEN_GLOBE_PREVIEW_FOCUS_MESSAGE_TYPE,
        datasetRef,
        treeUri: treeUri ?? null,
      },
      targetOrigin,
    );
  }, [datasetRef, targetOrigin, treeUri]);

  useEffect(() => {
    postPreviewFocusMessage();
  }, [postPreviewFocusMessage]);

  return (
    <section className="sticky top-4 z-10 rounded-2xl border border-border bg-background p-3 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-base font-medium flex items-center gap-2 min-w-0"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          <Globe2 className="shrink-0 size-4" />
          <span className="truncate">Green Globe — {datasetLabel}</span>
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <Button asChild variant="outline" size="sm" className="shrink-0 h-8 px-2 text-xs">
            <Link href={datasetPreviewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3" />
              <span className="hidden sm:inline">Dataset</span>
            </Link>
          </Button>
          {treeUri ? (
            <Button asChild variant="ghost" size="sm" className="shrink-0 h-8 px-2 text-xs">
              <Link href={focusedDatasetPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3" />
                <span className="hidden sm:inline">Tree</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {(typeof datasetTreeCount === "number" || treeName) ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {typeof datasetTreeCount === "number" ? (
            <span>{datasetTreeCount} tree{datasetTreeCount === 1 ? "" : "s"}</span>
          ) : null}
          {treeName ? (
            <span>Focused: <span className="text-foreground">{treeName}</span></span>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10">
        <iframe
          ref={iframeRef}
          title="Green Globe dataset preview"
          src={datasetPreviewUrl}
          className="h-[200px] w-full border-0 md:h-[340px]"
          loading="lazy"
          onLoad={postPreviewFocusMessage}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
}

export default GreenGlobeTreePreviewCard;
