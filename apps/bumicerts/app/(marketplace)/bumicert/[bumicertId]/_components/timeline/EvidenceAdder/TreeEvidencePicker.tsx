import type { OccurrenceItem } from "@/lib/graphql-dev/queries";
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

const TreeEvidencePicker = ({
  data,
  ...props
}: {
  data: OccurrenceItem[];
} & ViewerSharedProps) => {
  const tabConfig = getManagedEvidenceTabConfig("trees");

  return (
    <UriEvidencePicker
      tabId="trees"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) =>
        item.record?.scientificName ??
        item.record?.vernacularName ??
        "Unknown species"
      }
      getSecondary={(item) => {
        const count = item.record?.individualCount;
        const date = formatDate(
          item.record?.eventDate ?? item.record?.createdAt,
        );
        const secondary = [
          count != null ? `${count} individual${count !== 1 ? "s" : ""}` : null,
          date,
        ]
          .filter(Boolean)
          .join(" · ");
        return secondary || undefined;
      }}
      {...props}
    />
  );
};

export default TreeEvidencePicker;
