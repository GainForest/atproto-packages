import type { AudioRecordingItem } from "@/lib/graphql-dev/queries";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import type { ViewerSharedProps } from "./shared/evidenceTypes";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const AudioEvidencePicker = ({
  data,
  ...props
}: {
  data: AudioRecordingItem[];
} & ViewerSharedProps) => {
  const tabConfig = getManagedEvidenceTabConfig("audio");

  return (
    <UriEvidencePicker
      tabId="audio"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) => item.record?.name ?? "Untitled recording"}
      getSecondary={(item) =>
        formatDate(
          getRecordedAt(item.record?.metadata) ?? item.record?.createdAt,
        )
      }
      {...props}
    />
  );
};

function getRecordedAt(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined;
  }

  if (!("recordedAt" in metadata)) {
    return undefined;
  }

  const recordedAt = metadata.recordedAt;
  if (typeof recordedAt !== "string") {
    return undefined;
  }

  return recordedAt;
}

export default AudioEvidencePicker;
