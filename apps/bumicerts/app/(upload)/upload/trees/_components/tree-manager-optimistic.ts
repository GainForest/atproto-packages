import type {
  MeasurementItem,
  MultimediaItem,
  OccurrenceItem,
} from "@/graphql/indexer/queries";

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function sameOccurrenceRecord(
  left: NonNullable<OccurrenceItem["record"]>,
  right: NonNullable<OccurrenceItem["record"]>,
): boolean {
  return (
    left.scientificName === right.scientificName &&
    left.vernacularName === right.vernacularName &&
    left.eventDate === right.eventDate &&
    left.recordedBy === right.recordedBy &&
    left.locality === right.locality &&
    left.country === right.country &&
    left.decimalLatitude === right.decimalLatitude &&
    left.decimalLongitude === right.decimalLongitude &&
    left.occurrenceRemarks === right.occurrenceRemarks &&
    left.habitat === right.habitat &&
    left.establishmentMeans === right.establishmentMeans &&
    left.datasetRef === right.datasetRef
  );
}

function sameMeasurementItem(
  left: MeasurementItem,
  right: MeasurementItem,
): boolean {
  return (
    left.metadata.rkey === right.metadata.rkey &&
    left.record.occurrenceRef === right.record.occurrenceRef &&
    left.record.schemaVersion === right.record.schemaVersion &&
    left.record.measurementMethod === right.record.measurementMethod &&
    left.record.measurementRemarks === right.record.measurementRemarks &&
    sameJsonValue(left.record.result, right.record.result)
  );
}

export function sameMeasurementSet(
  left: MeasurementItem[],
  right: MeasurementItem[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const rightItem = right[index];
    return rightItem ? sameMeasurementItem(item, rightItem) : false;
  });
}

export function sameMultimediaRecord(
  left: MultimediaItem["record"],
  right: MultimediaItem["record"],
): boolean {
  return (
    left.occurrenceRef === right.occurrenceRef &&
    left.siteRef === right.siteRef &&
    left.subjectPart === right.subjectPart &&
    left.subjectPartUri === right.subjectPartUri &&
    left.subjectOrientation === right.subjectOrientation &&
    sameJsonValue(left.file, right.file) &&
    left.format === right.format &&
    left.accessUri === right.accessUri &&
    left.variantLiteral === right.variantLiteral &&
    left.caption === right.caption &&
    left.creator === right.creator &&
    left.createDate === right.createDate &&
    left.createdAt === right.createdAt
  );
}

export function mergeOptimisticOccurrences({
  occurrences,
  optimisticOccurrenceRecords,
  optimisticDeletedOccurrenceRkeys,
}: {
  occurrences: OccurrenceItem[];
  optimisticOccurrenceRecords: Record<
    string,
    NonNullable<OccurrenceItem["record"]>
  >;
  optimisticDeletedOccurrenceRkeys: Record<string, true>;
}): OccurrenceItem[] {
  return occurrences.flatMap((item) => {
    const metadata = item.metadata;
    const record = item.record;
    const rkey = metadata?.rkey;

    if (!metadata || !record || !rkey || optimisticDeletedOccurrenceRkeys[rkey]) {
      return [];
    }

    const optimisticRecord = optimisticOccurrenceRecords[rkey];

    return [
      {
        ...item,
        record:
          optimisticRecord && !sameOccurrenceRecord(record, optimisticRecord)
            ? optimisticRecord
            : record,
      },
    ];
  });
}

export function mergeOptimisticMeasurements({
  measurements,
  optimisticMeasurementRecords,
}: {
  measurements: MeasurementItem[];
  optimisticMeasurementRecords: Record<string, MeasurementItem[]>;
}): MeasurementItem[] {
  const overriddenOccurrenceUris = new Set(
    Object.keys(optimisticMeasurementRecords),
  );
  const measurementsByOccurrence = new Map<string, MeasurementItem[]>();

  for (const item of measurements) {
    const occurrenceRef = item.record.occurrenceRef;
    if (!occurrenceRef) {
      continue;
    }

    const existing = measurementsByOccurrence.get(occurrenceRef) ?? [];
    existing.push(item);
    measurementsByOccurrence.set(occurrenceRef, existing);
  }

  const mergedForOverrides = Object.entries(optimisticMeasurementRecords).flatMap(
    ([occurrenceUri, optimisticItems]) => {
      const serverItems = measurementsByOccurrence.get(occurrenceUri) ?? [];

      return sameMeasurementSet(serverItems, optimisticItems)
        ? serverItems
        : optimisticItems;
    },
  );

  const untouchedMeasurements = measurements.filter((item) => {
    const occurrenceRef = item.record.occurrenceRef;
    return !occurrenceRef || !overriddenOccurrenceUris.has(occurrenceRef);
  });

  return [...mergedForOverrides, ...untouchedMeasurements];
}

export function mergeOptimisticMultimedia({
  multimedia,
  optimisticAddedPhotos,
  optimisticDeletedPhotoRkeys,
  optimisticMultimediaRecords,
}: {
  multimedia: MultimediaItem[];
  optimisticAddedPhotos: Record<string, MultimediaItem[]>;
  optimisticDeletedPhotoRkeys: Record<string, true>;
  optimisticMultimediaRecords: Record<string, MultimediaItem["record"]>;
}): MultimediaItem[] {
  const basePhotos = multimedia.filter((item) => {
    const rkey = item.metadata?.rkey;
    return !rkey || optimisticDeletedPhotoRkeys[rkey] !== true;
  });

  const basePhotoRkeys = new Set(
    basePhotos
      .map((item) => item.metadata?.rkey)
      .filter((value): value is string => typeof value === "string"),
  );

  const optimisticPhotos = Object.values(optimisticAddedPhotos)
    .flat()
    .filter((item) => {
      const rkey = item.metadata?.rkey;
      return (
        typeof rkey === "string" &&
        optimisticDeletedPhotoRkeys[rkey] !== true &&
        !basePhotoRkeys.has(rkey)
      );
    });

  return [...optimisticPhotos, ...basePhotos].map((item) => {
    const rkey = item.metadata?.rkey;
    const optimisticRecord = rkey ? optimisticMultimediaRecords[rkey] : undefined;

    if (!optimisticRecord || sameMultimediaRecord(item.record, optimisticRecord)) {
      return item;
    }

    return {
      ...item,
      record: optimisticRecord,
    };
  });
}

export function reconcileOptimisticOccurrenceRecords({
  optimisticOccurrenceRecords,
  serverOccurrences,
}: {
  optimisticOccurrenceRecords: Record<
    string,
    NonNullable<OccurrenceItem["record"]>
  >;
  serverOccurrences: OccurrenceItem[];
}): Record<string, NonNullable<OccurrenceItem["record"]>> {
  const serverByRkey = new Map(
    serverOccurrences.flatMap((item) => {
      const rkey = item.metadata?.rkey;
      const record = item.record;
      return rkey && record ? [[rkey, record] as const] : [];
    }),
  );

  return Object.fromEntries(
    Object.entries(optimisticOccurrenceRecords).filter(
      ([rkey, optimisticRecord]) => {
        const serverRecord = serverByRkey.get(rkey);
        return !serverRecord || !sameOccurrenceRecord(serverRecord, optimisticRecord);
      },
    ),
  );
}

export function reconcileOptimisticMeasurementRecords({
  optimisticMeasurementRecords,
  serverMeasurements,
}: {
  optimisticMeasurementRecords: Record<string, MeasurementItem[]>;
  serverMeasurements: MeasurementItem[];
}): Record<string, MeasurementItem[]> {
  const serverByOccurrence = new Map<string, MeasurementItem[]>();

  for (const item of serverMeasurements) {
    const occurrenceRef = item.record.occurrenceRef;
    if (!occurrenceRef) {
      continue;
    }

    const existing = serverByOccurrence.get(occurrenceRef) ?? [];
    existing.push(item);
    serverByOccurrence.set(occurrenceRef, existing);
  }

  return Object.fromEntries(
    Object.entries(optimisticMeasurementRecords).filter(
      ([occurrenceUri, optimisticItems]) => {
        const serverItems = serverByOccurrence.get(occurrenceUri) ?? [];
        return !sameMeasurementSet(serverItems, optimisticItems);
      },
    ),
  );
}

export function reconcileOptimisticMultimediaRecords({
  optimisticMultimediaRecords,
  serverMultimedia,
}: {
  optimisticMultimediaRecords: Record<string, MultimediaItem["record"]>;
  serverMultimedia: MultimediaItem[];
}): Record<string, MultimediaItem["record"]> {
  const serverByRkey = new Map(
    serverMultimedia.flatMap((item) => {
      const rkey = item.metadata?.rkey;
      return rkey ? [[rkey, item.record] as const] : [];
    }),
  );

  return Object.fromEntries(
    Object.entries(optimisticMultimediaRecords).filter(
      ([rkey, optimisticRecord]) => {
        const serverRecord = serverByRkey.get(rkey);
        return !serverRecord || !sameMultimediaRecord(serverRecord, optimisticRecord);
      },
    ),
  );
}
