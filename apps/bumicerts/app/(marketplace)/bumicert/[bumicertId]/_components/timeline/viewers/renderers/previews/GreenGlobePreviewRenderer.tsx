import { ExternalLinkIcon } from "lucide-react";
import type { TimelinePreviewPayload } from "../../../shared/timelineFeedViewModel";

interface GreenGlobePreviewRendererProps {
  preview: TimelinePreviewPayload;
}

export function GreenGlobePreviewRenderer({
  preview,
}: GreenGlobePreviewRendererProps) {
  if (preview.kind !== "green-globe") {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
        <span>Green Globe preview</span>
        <a
          href={preview.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Open
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>
      <iframe
        title={preview.title}
        src={preview.href}
        className="h-[200px] w-full border-0 md:h-[320px]"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      <p className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
        If the preview does not load, open Green Globe in a new tab.
      </p>
    </div>
  );
}
