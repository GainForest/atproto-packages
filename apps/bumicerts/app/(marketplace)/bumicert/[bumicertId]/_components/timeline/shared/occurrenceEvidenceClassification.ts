import type { OccurrenceItem } from "@/graphql/indexer/queries";

const TREE_DATA_TYPE = "measuredtree";
const TREE_SOURCE = "bumicerts";
const BIODIVERSITY_DATA_TYPES = new Set([
  "biodiversity",
  "biodiversityobservation",
  "speciesobservation",
  "occurrence",
]);
const BIODIVERSITY_SOURCES = new Set(["gbif", "inaturalist", "inat"]);

export function getOccurrenceDynamicProperty(
  value: string | null | undefined,
  key: string,
): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const field = Reflect.get(parsed, key);
    return typeof field === "string" ? field : null;
  } catch {
    return null;
  }
}

function normalizeDynamicValue(value: string | null): string | null {
  return value?.trim().replaceAll(/[_\s-]+/g, "").toLowerCase() ?? null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getOccurrenceDatasetRef(item: OccurrenceItem): string | null {
  const recordDatasetRef = item.record?.datasetRef;
  if (hasText(recordDatasetRef)) {
    return recordDatasetRef;
  }

  const dynamicDatasetRef = getOccurrenceDynamicProperty(
    item.record?.dynamicProperties,
    "datasetRef",
  );
  return hasText(dynamicDatasetRef) ? dynamicDatasetRef : null;
}

export function isMeasuredTreeOccurrence(item: OccurrenceItem): boolean {
  const dataType = normalizeDynamicValue(
    getOccurrenceDynamicProperty(item.record?.dynamicProperties, "dataType"),
  );
  const source = normalizeDynamicValue(
    getOccurrenceDynamicProperty(item.record?.dynamicProperties, "source"),
  );

  return (
    dataType === TREE_DATA_TYPE ||
    source === TREE_SOURCE ||
    hasText(item.record?.establishmentMeans)
  );
}

export function isTreeDatasetOccurrence(item: OccurrenceItem): boolean {
  return isMeasuredTreeOccurrence(item) && getOccurrenceDatasetRef(item) !== null;
}

export function isBiodiversityOccurrence(item: OccurrenceItem): boolean {
  if (isMeasuredTreeOccurrence(item) || getOccurrenceDatasetRef(item)) {
    return false;
  }

  const dataType = normalizeDynamicValue(
    getOccurrenceDynamicProperty(item.record?.dynamicProperties, "dataType"),
  );
  const source = normalizeDynamicValue(
    getOccurrenceDynamicProperty(item.record?.dynamicProperties, "source"),
  );

  if (dataType && BIODIVERSITY_DATA_TYPES.has(dataType)) {
    return true;
  }

  if (source && BIODIVERSITY_SOURCES.has(source)) {
    return true;
  }

  return (
    hasText(item.record?.kingdom) ||
    hasText(item.record?.basisOfRecord) ||
    hasText(item.record?.occurrenceRemarks)
  );
}
