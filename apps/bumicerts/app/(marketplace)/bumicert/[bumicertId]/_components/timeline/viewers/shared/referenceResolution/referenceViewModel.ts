import type {
  AudioRecordingItem,
  CertifiedLocation,
  DatasetItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import { links } from "@/lib/links";
import { formatDate } from "@/lib/utils/date";
import { isCertifiedLocationRecordUri, type ParsedAtUri } from "./atUri";
import { buildDatasetEvidenceStats } from "../../../shared/datasetStats";

type ReferenceKind = "audio" | "occurrence" | "dataset" | "location" | "unknown";

type ReferenceMetrics = {
  recordCount?: number;
  speciesCount?: number;
  treeCount?: number;
  observationCount?: number;
};

export interface ResolvedAttachmentReference {
  id: string;
  kind: ReferenceKind;
  title: string;
  description?: string;
  recordedAt?: string | null;
  recordedDateRange?: string | null;
  datasetRef?: string | null;
  metrics?: ReferenceMetrics;
  greenGlobeHref?: string;
  actionHref?: string;
  actionLabel?: string;
}

function getRecordedAt(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  if (!("recordedAt" in metadata)) return undefined;
  return typeof metadata.recordedAt === "string" ? metadata.recordedAt : undefined;
}

function getAudioBlobUri(item: AudioRecordingItem | undefined): string | undefined {
  const blob = item?.record?.blob;
  if (typeof blob !== "object" || blob === null) {
    return undefined;
  }

  const file = Reflect.get(blob, "file");
  if (typeof file === "object" && file !== null) {
    const nestedUri = Reflect.get(file, "uri");
    if (typeof nestedUri === "string" && nestedUri.length > 0) {
      return nestedUri;
    }
  }

  const uri = Reflect.get(blob, "uri");
  return typeof uri === "string" && uri.length > 0 ? uri : undefined;
}

export function buildResolvedReference(args: {
  uri: string;
  parsed: ParsedAtUri | null;
  audio?: AudioRecordingItem;
  occurrence?: OccurrenceItem;
  dataset?: DatasetItem;
  datasetOccurrences?: OccurrenceItem[];
  location?: CertifiedLocation;
  labels: {
    linkedRecord: string;
    linkedAudioRecord: string;
    audioEvidence: string;
    playRecording: string;
    linkedDataset: string;
    viewGreenGlobe: string;
    linkedTreeRecord: string;
    linkedSiteRecord: string;
    siteEvidence: string;
    openSiteMap: string;
    recordCount: (count: number) => string;
    speciesCount: (count: number) => string;
    individualCount: (count: number) => string;
  };
}): ResolvedAttachmentReference {
  const { uri, parsed, audio, occurrence, dataset, datasetOccurrences, location, labels } = args;

  if (!parsed) {
    return { id: uri, kind: "unknown", title: labels.linkedRecord };
  }

  if (parsed.collection === "app.gainforest.ac.audio") {
    const date = formatDate(getRecordedAt(audio?.record?.metadata) ?? audio?.record?.createdAt);
    return {
      id: uri,
      kind: "audio",
      title: audio?.record?.name ?? labels.linkedAudioRecord,
      description: date || labels.audioEvidence,
      recordedAt: getRecordedAt(audio?.record?.metadata) ?? audio?.record?.createdAt ?? null,
      actionHref: getAudioBlobUri(audio),
      actionLabel: labels.playRecording,
    };
  }

  if (parsed.collection === "app.gainforest.dwc.dataset") {
    const stats = buildDatasetEvidenceStats(
      datasetOccurrences ?? [],
      dataset?.record?.recordCount,
    );
    const recordCount = stats.recordCount;
    return {
      id: uri,
      kind: "dataset",
      title: dataset?.record?.name ?? labels.linkedDataset,
      description: [
        recordCount > 0 ? labels.recordCount(recordCount) : null,
        stats.speciesCount > 0
          ? labels.speciesCount(stats.speciesCount)
          : null,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" · ") || undefined,
      recordedAt: dataset?.record?.createdAt ?? dataset?.metadata?.createdAt ?? null,
      recordedDateRange: stats.recordedDateRange,
      datasetRef: uri,
      metrics: {
        recordCount,
        treeCount: recordCount,
        speciesCount: stats.speciesCount,
      },
      greenGlobeHref: links.external.greenGlobeTreePreview(parsed.did, {
        datasetRef: uri,
      }),
      actionHref: links.external.greenGlobeTreePreview(parsed.did, {
        datasetRef: uri,
      }),
      actionLabel: labels.viewGreenGlobe,
    };
  }

  if (parsed.collection === "app.gainforest.dwc.occurrence") {
    const count = occurrence?.record?.individualCount;
    const countText =
      count == null ? null : labels.individualCount(count);
    const when = formatDate(
      occurrence?.record?.eventDate ?? occurrence?.record?.createdAt,
    );
    return {
      id: uri,
      kind: "occurrence",
      title:
        occurrence?.record?.scientificName ??
        occurrence?.record?.vernacularName ??
        labels.linkedTreeRecord,
      description: [countText, when].filter(Boolean).join(" · ") || undefined,
      recordedAt: occurrence?.record?.eventDate ?? occurrence?.record?.createdAt ?? null,
      datasetRef: occurrence?.record?.datasetRef ?? null,
    };
  }

  if (parsed.collection === "app.certified.location") {
    const locationUri = location?.metadata?.uri ?? uri;
    const canViewMap = isCertifiedLocationRecordUri(locationUri);
    return {
      id: uri,
      kind: "location",
      title: location?.record?.name ?? labels.linkedSiteRecord,
      description: location?.record?.locationType ?? labels.siteEvidence,
      actionHref: canViewMap
        ? links.external.polygonsAppUrl({
            mode: "view",
            params: { certifiedLocationRecordUri: locationUri },
          })
        : undefined,
      actionLabel: labels.openSiteMap,
    };
  }

  return { id: uri, kind: "unknown", title: labels.linkedRecord };
}
