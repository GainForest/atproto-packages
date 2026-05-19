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
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-sm text-muted-foreground">
      <p>Use the shared Green Globe map above to preview dataset layers.</p>
      <a
        href={preview.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 text-foreground hover:text-primary"
      >
        Open Green Globe
        <ExternalLinkIcon className="h-4 w-4" />
      </a>
    </div>
  );
}
