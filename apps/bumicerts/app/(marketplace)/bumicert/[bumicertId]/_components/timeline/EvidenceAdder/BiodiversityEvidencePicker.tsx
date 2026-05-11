import type { OccurrenceItem } from "@/graphql/indexer/queries";
import { formatDate } from "@/lib/utils/date";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";
import { isBiodiversityOccurrence } from "../shared/occurrenceEvidenceClassification";

function getObservationTitle(item: OccurrenceItem): string {
  return (
    item.record?.scientificName ??
    item.record?.vernacularName ??
    item.record?.occurrenceRemarks ??
    "Unknown observation"
  );
}

const BiodiversityEvidencePicker = ({
  data,
}: {
  data: OccurrenceItem[];
}) => {
  const tabConfig = getManagedEvidenceTabConfig("biodiversity");
  const biodiversityRecords = data.filter(isBiodiversityOccurrence);

  return (
    <UriEvidencePicker
      tabId="biodiversity"
      data={biodiversityRecords}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={getObservationTitle}
      getSecondary={(item) => {
        const date = formatDate(item.record?.eventDate ?? item.record?.createdAt, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const location = item.record?.locality ?? item.record?.stateProvince;
        return [item.record?.kingdom, date, location]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" · ");
      }}
    />
  );
};

export default BiodiversityEvidencePicker;
