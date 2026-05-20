import type {
  CertifiedLocation,
  DatasetItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";
import { ListEmpty, ListLayout } from "./shared/RecordList";
import CheckRow from "./shared/CheckRow";
import ManageOption from "./shared/ManageOption";
import OptionalNote from "./shared/OptionalNote";
import Mutator, { type AttachmentData } from "./shared/Mutator";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";
import { useEvidenceAdderStore } from "./shared/evidenceAdderStore";
import { useUriSelection } from "./shared/useUriSelection";
import {
  buildDatasetSiteContexts,
  getDatasetSiteContext,
  groupDatasetUrisBySite,
  type DatasetSiteContext,
} from "./shared/datasetSiteContext";
import { buildDatasetEvidenceStatsByUri } from "../shared/datasetStats";
import {
  getOccurrenceDatasetRef,
  isTreeDatasetOccurrence,
} from "../shared/occurrenceEvidenceClassification";
import { useTranslations } from "next-intl";

function hasTreeDatasetMetadata(item: DatasetItem): boolean {
  return (
    typeof item.record?.establishmentMeans === "string" &&
    item.record.establishmentMeans.length > 0
  );
}

const DatasetEvidencePicker = ({
  datasets,
  occurrences,
  locations,
}: {
  datasets: DatasetItem[];
  occurrences: OccurrenceItem[];
  locations: CertifiedLocation[];
}) => {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const tabConfig = getManagedEvidenceTabConfig("trees");
  const description = useEvidenceAdderStore((state) => state.description);
  const resetDescription = useEvidenceAdderStore(
    (state) => state.resetDescription,
  );
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);
  const activityUri = useEvidenceAdderStore((state) => state.activityUri);
  const activityCid = useEvidenceAdderStore((state) => state.activityCid);
  const treeOccurrences = occurrences.filter(isTreeDatasetOccurrence);
  const statsByDataset = buildDatasetEvidenceStatsByUri(treeOccurrences);
  const treeDatasetUris = new Set(
    treeOccurrences.flatMap((occurrence) => {
      const datasetRef = getOccurrenceDatasetRef(occurrence);
      return datasetRef ? [datasetRef] : [];
    }),
  );
  const siteContextsByDataset = buildDatasetSiteContexts({
    occurrences: treeOccurrences.flatMap((occurrence) => {
      const datasetUri = getOccurrenceDatasetRef(occurrence);
      return datasetUri
        ? [{ datasetUri, siteRef: occurrence.record.siteRef }]
        : [];
    }),
    locations,
  });
  const rows = datasets
    .filter((dataset) => {
      const datasetUri = dataset.metadata?.uri;
      return (
        hasTreeDatasetMetadata(dataset) ||
        (typeof datasetUri === "string" && treeDatasetUris.has(datasetUri))
      );
    })
    .flatMap((dataset) => {
      const uri = dataset.metadata?.uri;
      return uri ? [{ item: dataset, uri }] : [];
    });
  const selectableUris = new Set(
    rows.flatMap(({ uri }) => {
      const context = getDatasetSiteContext(siteContextsByDataset, uri);
      return context.status === "ready" ? [uri] : [];
    }),
  );
  const { selectedUris, selectedContents, toggleUri, resetSelection } =
    useUriSelection(selectableUris);
  const groupedSelections = groupDatasetUrisBySite({
    datasetUris: selectedContents,
    contexts: siteContextsByDataset,
  });
  const computedMutationData: AttachmentData[] = groupedSelections.map(
    (group) => ({
      title: t("attachmentTitles.trees"),
      contentType: tabConfig.attachment.contentType,
      description,
      subjectInfo: {
        uri: activityUri,
        cid: activityCid,
      },
      contextualSubjects: [group.siteSubject],
      contents: group.datasetUris,
    }),
  );

  if (rows.length === 0) {
    return <ListEmpty tabId="trees" />;
  }

  const getSiteContextLabel = (context: DatasetSiteContext): string => {
    if (context.status === "ready") {
      return context.siteName
        ? t("siteContextLabel", { siteName: context.siteName })
        : t("siteContextReady");
    }

    if (context.status === "mixed-site-refs") {
      return t("siteContextMixed");
    }

    if (context.status === "incomplete-site-ref") {
      return t("siteContextIncomplete");
    }

    if (context.status === "unresolved-site") {
      return t("siteContextUnresolved");
    }

    return t("siteContextUnavailable");
  };

  return (
    <>
      <ListLayout>
        {rows.map(({ item, uri }) => {
          const stats = statsByDataset.get(uri);
          const treeCount = stats?.recordCount ?? item.record?.recordCount ?? 0;
          const speciesCount = stats?.speciesCount ?? 0;
          const dateRange = stats?.recordedDateRange;
          const siteContext = getDatasetSiteContext(siteContextsByDataset, uri);
          const canSelect = siteContext.status === "ready";
          const secondary = [
            t("treeCount", { count: treeCount }),
            speciesCount > 0 ? t("speciesCount", { count: speciesCount }) : null,
            dateRange,
            getSiteContextLabel(siteContext),
          ]
            .filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0,
            )
            .join(" · ");

          return (
            <CheckRow
              key={uri}
              selected={canSelect && selectedUris.has(uri)}
              onToggle={() => toggleUri(uri)}
              icon={tabConfig.icon}
              primary={item.record?.name ?? t("unnamedTreeDataset")}
              secondary={secondary}
              disabled={isSubmitting || !canSelect}
            />
          );
        })}
      </ListLayout>
      <ManageOption type="trees" />
      <OptionalNote disabled={isSubmitting} />
      <Mutator
        data={computedMutationData}
        onSuccess={() => {
          resetDescription();
          resetSelection();
        }}
      />
    </>
  );
};

export default DatasetEvidencePicker;
