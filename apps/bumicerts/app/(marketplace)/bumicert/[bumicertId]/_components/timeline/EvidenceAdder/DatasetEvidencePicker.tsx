import type { DatasetItem, OccurrenceItem } from "@/graphql/indexer/queries";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";
import { buildDatasetEvidenceStatsByUri } from "../shared/datasetStats";
import {
  getOccurrenceDatasetRef,
  isTreeDatasetOccurrence,
} from "../shared/occurrenceEvidenceClassification";
import { useTranslations } from "next-intl";

function hasTreeDatasetMetadata(item: DatasetItem): boolean {
  return typeof item.record?.establishmentMeans === "string" && item.record.establishmentMeans.length > 0;
}

const DatasetEvidencePicker = ({
  datasets,
  occurrences,
}: {
  datasets: DatasetItem[];
  occurrences: OccurrenceItem[];
}) => {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const tabConfig = getManagedEvidenceTabConfig("trees");
  const treeOccurrences = occurrences.filter(isTreeDatasetOccurrence);
  const statsByDataset = buildDatasetEvidenceStatsByUri(treeOccurrences);
  const treeDatasetUris = new Set(
    treeOccurrences.flatMap((occurrence) => {
      const datasetRef = getOccurrenceDatasetRef(occurrence);
      return datasetRef ? [datasetRef] : [];
    }),
  );
  const treeDatasets = datasets.filter((dataset) => {
    const datasetUri = dataset.metadata?.uri;
    return (
      hasTreeDatasetMetadata(dataset) ||
      (typeof datasetUri === "string" && treeDatasetUris.has(datasetUri))
    );
  });

  return (
    <UriEvidencePicker
      tabId="trees"
      data={treeDatasets}
      icon={tabConfig.icon}
      mutation={{ ...tabConfig.attachment, title: t("attachmentTitles.trees") }}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) => item.record?.name ?? t("unnamedTreeDataset")}
      getSecondary={(item) => {
        const datasetUri = item.metadata?.uri;
        const stats = datasetUri ? statsByDataset.get(datasetUri) : undefined;
        const treeCount = stats?.recordCount ?? item.record?.recordCount ?? 0;
        const speciesCount = stats?.speciesCount ?? 0;
        const dateRange = stats?.recordedDateRange;
        return [
          t("treeCount", { count: treeCount }),
          speciesCount > 0
            ? t("speciesCount", { count: speciesCount })
            : null,
          dateRange,
        ]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" · ");
      }}
    />
  );
};

export default DatasetEvidencePicker;
