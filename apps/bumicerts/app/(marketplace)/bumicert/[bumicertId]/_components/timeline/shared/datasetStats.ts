import type { OccurrenceItem } from "@/graphql/indexer/queries";

export type DatasetEvidenceStats = {
  recordCount: number;
  speciesCount: number;
  recordedDateRange: string | null;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
};

type ParsedDateRange = {
  start: Date;
  end: Date;
};

function normalizePartialIsoDate(value: string): string {
  if (/^\d{4}$/.test(value)) {
    return `${value}-01-01`;
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }

  return value;
}

function parseDatePart(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(normalizePartialIsoDate(trimmed));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseEvidenceDateRange(value: string | null | undefined): ParsedDateRange | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const [startRaw, endRaw] = trimmed.split("/");
  const start = parseDatePart(startRaw);
  const end = parseDatePart(endRaw ?? startRaw);

  if (!start || !end) {
    return null;
  }

  return start.getTime() <= end.getTime()
    ? { start, end }
    : { start: end, end: start };
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function formatDateRange(start: Date, end: Date): string {
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return formatMonthYear(start);
  }

  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}

function getSpeciesKey(item: OccurrenceItem): string | null {
  const scientificName = item.record?.scientificName?.trim();
  if (scientificName) {
    return scientificName.toLowerCase();
  }

  const vernacularName = item.record?.vernacularName?.trim();
  if (vernacularName) {
    return vernacularName.toLowerCase();
  }

  return null;
}

export function formatEvidenceDateRangeFromValues(
  values: Array<string | null | undefined>,
): string | null {
  const parsedRanges = values
    .map(parseEvidenceDateRange)
    .filter((range): range is ParsedDateRange => range !== null);

  if (parsedRanges.length === 0) {
    return null;
  }

  const first = parsedRanges.reduce((current, next) =>
    next.start.getTime() < current.start.getTime() ? next : current,
  ).start;
  const last = parsedRanges.reduce((current, next) =>
    next.end.getTime() > current.end.getTime() ? next : current,
  ).end;

  return formatDateRange(first, last);
}

export function buildDatasetEvidenceStats(
  occurrences: OccurrenceItem[],
  fallbackRecordCount?: number | null,
): DatasetEvidenceStats {
  const species = new Set<string>();
  const parsedRanges: ParsedDateRange[] = [];

  for (const occurrence of occurrences) {
    const speciesKey = getSpeciesKey(occurrence);
    if (speciesKey) {
      species.add(speciesKey);
    }

    const range = parseEvidenceDateRange(occurrence.record?.eventDate);
    if (range) {
      parsedRanges.push(range);
    }
  }

  const first = parsedRanges.length > 0
    ? parsedRanges.reduce((current, next) =>
        next.start.getTime() < current.start.getTime() ? next : current,
      ).start
    : null;
  const last = parsedRanges.length > 0
    ? parsedRanges.reduce((current, next) =>
        next.end.getTime() > current.end.getTime() ? next : current,
      ).end
    : null;

  return {
    recordCount: occurrences.length > 0 ? occurrences.length : fallbackRecordCount ?? 0,
    speciesCount: species.size,
    recordedDateRange: first && last ? formatDateRange(first, last) : null,
    firstRecordedAt: first?.toISOString() ?? null,
    lastRecordedAt: last?.toISOString() ?? null,
  };
}

export function buildDatasetEvidenceStatsByUri(
  occurrences: OccurrenceItem[],
): Map<string, DatasetEvidenceStats> {
  const grouped = new Map<string, OccurrenceItem[]>();

  for (const occurrence of occurrences) {
    const datasetRef = occurrence.record?.datasetRef;
    if (!datasetRef) {
      continue;
    }

    const current = grouped.get(datasetRef) ?? [];
    current.push(occurrence);
    grouped.set(datasetRef, current);
  }

  const stats = new Map<string, DatasetEvidenceStats>();
  for (const [datasetRef, datasetOccurrences] of grouped) {
    stats.set(datasetRef, buildDatasetEvidenceStats(datasetOccurrences));
  }

  return stats;
}
