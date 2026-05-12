import { parseAttachmentContent } from "./attachmentContentParser";

export type TimelineEvidenceFilter = "all" | "tree" | "audio" | "biodiversity" | "document";
export type TimelineEvidenceKind = Exclude<TimelineEvidenceFilter, "all"> | "site" | "other";

export const TIMELINE_EVIDENCE_FILTERS: Array<{
  id: TimelineEvidenceFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "tree", label: "Tree" },
  { id: "audio", label: "Audio" },
  { id: "biodiversity", label: "Biodiversity" },
  { id: "document", label: "Document" },
];

function contentHasCollection(content: unknown, collection: string): boolean {
  return parseAttachmentContent(content).some((item) => {
    if (item.kind !== "uri" || item.uriKind !== "at-uri") {
      return false;
    }

    return item.uri.includes(`/${collection}/`);
  });
}

export function getTimelineEvidenceKind(
  contentType: string | null | undefined,
  content: unknown,
): TimelineEvidenceKind {
  const normalized = contentType?.trim().toLowerCase();

  if (normalized === "tree-dataset" || normalized === "occurrence") {
    return "tree";
  }

  if (normalized === "biodiversity" || normalized === "biodiversity-observations") {
    return "biodiversity";
  }

  if (normalized === "audio") {
    return "audio";
  }

  if (normalized === "location") {
    return "site";
  }

  if (contentHasCollection(content, "app.certified.location")) {
    return "site";
  }

  if (contentHasCollection(content, "app.gainforest.dwc.dataset")) {
    return "tree";
  }

  return "document";
}

export function getTimelineEvidenceKindLabel(kind: TimelineEvidenceKind): string {
  if (kind === "tree") return "Tree dataset";
  if (kind === "audio") return "Acoustic data";
  if (kind === "biodiversity") return "Biodiversity observations";
  if (kind === "document") return "Document";
  if (kind === "site") return "Site";
  return "Evidence";
}

export function matchesTimelineFilter(
  kind: TimelineEvidenceKind,
  filter: TimelineEvidenceFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  return kind === filter;
}
