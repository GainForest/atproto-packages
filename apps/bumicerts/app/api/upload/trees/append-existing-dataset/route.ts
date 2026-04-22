import { ComAtprotoRepoPutRecord } from "@atproto/api";
import { $parse as parseDatasetRecord } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import { $parse as parseMeasurementRecord } from "@gainforest/generated/app/gainforest/dwc/measurement.defs";
import { $parse as parseOccurrenceRecord } from "@gainforest/generated/app/gainforest/dwc/occurrence.defs";
import { NextResponse, type NextRequest } from "next/server";
import type {
  AppendExistingDatasetResponse,
  AppendExistingDatasetRowResult,
} from "@/lib/upload/append-existing-dataset";
import { isAppendExistingDatasetRequest } from "@/lib/upload/append-existing-dataset";
import { auth } from "@/lib/auth";
import { occurrenceInputToCreateInput } from "@/lib/upload/occurrence-adapter";
import { buildTreeDynamicProperties } from "@/lib/upload/tree-dynamic-properties";
import type { FloraMeasurementBundle } from "@/lib/upload/types";

const DATASET_COLLECTION = "app.gainforest.dwc.dataset";
const OCCURRENCE_COLLECTION = "app.gainforest.dwc.occurrence";
const MEASUREMENT_COLLECTION = "app.gainforest.dwc.measurement";
const MAX_DATASET_COUNT_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 50;
const LIST_RECORDS_PAGE_LIMIT = 100;

type AuthenticatedAgent = NonNullable<
  Awaited<ReturnType<typeof auth.session.getAuthenticatedAgent>>
>;

type CreatedRecord = {
  uri: string;
  cid: string;
  rkey: string;
};

type PersistedOccurrence = {
  index: number;
  occurrenceUri: string;
  occurrenceRkey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDidSession(session: unknown): session is { did: string } {
  return isRecord(session) && typeof session.did === "string";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetryDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * BASE_RETRY_DELAY_MS);
  return BASE_RETRY_DELAY_MS * 2 ** attempt + jitter;
}

function isDatasetUnavailableError(error: unknown): boolean {
  if (isRecord(error) && error.status === 404) {
    return true;
  }

  if (
    isRecord(error) &&
    isRecord(error.cause) &&
    error.cause.status === 404
  ) {
    return true;
  }

  return false;
}

async function createOccurrenceRecord(options: {
  agent: AuthenticatedAgent;
  occurrenceInput: ReturnType<typeof occurrenceInputToCreateInput>;
}): Promise<CreatedRecord> {
  const { agent, occurrenceInput } = options;
  const createdAt = new Date().toISOString();
  const candidate = {
    $type: OCCURRENCE_COLLECTION,
    scientificName: occurrenceInput.scientificName,
    eventDate: occurrenceInput.eventDate,
    decimalLatitude: occurrenceInput.decimalLatitude,
    decimalLongitude: occurrenceInput.decimalLongitude,
    basisOfRecord: occurrenceInput.basisOfRecord ?? "HumanObservation",
    occurrenceID: crypto.randomUUID(),
    occurrenceStatus: "present",
    geodeticDatum: "EPSG:4326",
    license: "CC-BY-4.0",
    kingdom: occurrenceInput.kingdom ?? "Plantae",
    ...(occurrenceInput.vernacularName
      ? { vernacularName: occurrenceInput.vernacularName }
      : {}),
    ...(occurrenceInput.recordedBy
      ? { recordedBy: occurrenceInput.recordedBy }
      : {}),
    ...(occurrenceInput.locality ? { locality: occurrenceInput.locality } : {}),
    ...(occurrenceInput.country ? { country: occurrenceInput.country } : {}),
    ...(occurrenceInput.countryCode
      ? { countryCode: occurrenceInput.countryCode }
      : {}),
    ...(occurrenceInput.occurrenceRemarks
      ? { occurrenceRemarks: occurrenceInput.occurrenceRemarks }
      : {}),
    ...(occurrenceInput.habitat ? { habitat: occurrenceInput.habitat } : {}),
    ...(occurrenceInput.samplingProtocol
      ? { samplingProtocol: occurrenceInput.samplingProtocol }
      : {}),
    ...(occurrenceInput.establishmentMeans
      ? { establishmentMeans: occurrenceInput.establishmentMeans }
      : {}),
    ...(occurrenceInput.datasetRef ? { datasetRef: occurrenceInput.datasetRef } : {}),
    ...(occurrenceInput.dynamicProperties
      ? { dynamicProperties: occurrenceInput.dynamicProperties }
      : {}),
    createdAt,
  };
  const record = parseOccurrenceRecord(candidate);
  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: OCCURRENCE_COLLECTION,
    record,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey: response.data.uri.split("/").pop() ?? "unknown",
  };
}

async function createMeasurementRecord(options: {
  agent: AuthenticatedAgent;
  occurrenceUri: string;
  floraMeasurement: FloraMeasurementBundle;
}): Promise<CreatedRecord> {
  const { agent, occurrenceUri, floraMeasurement } = options;
  const candidate = {
    $type: MEASUREMENT_COLLECTION,
    occurrenceRef: occurrenceUri,
    result: {
      $type: "app.gainforest.dwc.measurement#floraMeasurement",
      ...(floraMeasurement.dbh ? { dbh: floraMeasurement.dbh } : {}),
      ...(floraMeasurement.totalHeight
        ? { totalHeight: floraMeasurement.totalHeight }
        : {}),
      ...(floraMeasurement.diameter
        ? { basalDiameter: floraMeasurement.diameter }
        : {}),
      ...(floraMeasurement.canopyCoverPercent
        ? { canopyCoverPercent: floraMeasurement.canopyCoverPercent }
        : {}),
    },
    createdAt: new Date().toISOString(),
  };
  const record = parseMeasurementRecord(candidate);
  const response = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: MEASUREMENT_COLLECTION,
    record,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey: response.data.uri.split("/").pop() ?? "unknown",
  };
}

async function deleteRecord(options: {
  agent: AuthenticatedAgent;
  collection: string;
  rkey: string;
}): Promise<void> {
  const { agent, collection, rkey } = options;
  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection,
    rkey,
  });
}

function getOccurrenceDatasetRef(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.datasetRef === "string" ? value.datasetRef : null;
}

async function countDatasetOccurrences(options: {
  agent: AuthenticatedAgent;
  did: string;
  datasetUri: string;
}): Promise<number> {
  const { agent, did, datasetUri } = options;
  let cursor: string | undefined;
  let count = 0;

  do {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: OCCURRENCE_COLLECTION,
      limit: LIST_RECORDS_PAGE_LIMIT,
      cursor,
    });

    for (const record of response.data.records) {
      if (getOccurrenceDatasetRef(record.value) === datasetUri) {
        count += 1;
      }
    }

    cursor = response.data.cursor;
  } while (cursor);

  return count;
}

async function incrementDatasetRecordCount(options: {
  agent: AuthenticatedAgent;
  did: string;
  rkey: string;
  incrementBy: number;
}): Promise<{ datasetUri: string; recordCount: number }> {
  const { agent, did, rkey, incrementBy } = options;

  for (let attempt = 0; attempt < MAX_DATASET_COUNT_ATTEMPTS; attempt += 1) {
    const currentRecordResponse = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: DATASET_COLLECTION,
      rkey,
    });
    const currentRecord = parseDatasetRecord(currentRecordResponse.data.value);
    const currentRecordCount =
      currentRecord.recordCount ??
      (await countDatasetOccurrences({
        agent,
        did,
        datasetUri: currentRecordResponse.data.uri,
      }));
    const nextRecord = parseDatasetRecord({
      ...currentRecord,
      $type: DATASET_COLLECTION,
      createdAt: currentRecord.createdAt,
      recordCount: currentRecordCount + incrementBy,
    });

    try {
      await agent.com.atproto.repo.putRecord({
        repo: did,
        collection: DATASET_COLLECTION,
        rkey,
        swapRecord: currentRecordResponse.data.cid,
        record: nextRecord,
      });

      return {
        datasetUri: currentRecordResponse.data.uri,
        recordCount: nextRecord.recordCount ?? 0,
      };
    } catch (error) {
      const isLastAttempt = attempt === MAX_DATASET_COUNT_ATTEMPTS - 1;
      if (!(error instanceof ComAtprotoRepoPutRecord.InvalidSwapError) || isLastAttempt) {
        throw error;
      }

      await delay(buildRetryDelayMs(attempt));
    }
  }

  throw new Error("Failed to increment dataset count after retries.");
}

async function unsetOccurrenceDatasetAssociation(options: {
  agent: AuthenticatedAgent;
  did: string;
  rkey: string;
}): Promise<void> {
  const { agent, did, rkey } = options;
  const currentRecordResponse = await agent.com.atproto.repo.getRecord({
    repo: did,
    collection: OCCURRENCE_COLLECTION,
    rkey,
  });
  const currentRecord = parseOccurrenceRecord(currentRecordResponse.data.value);
  const candidate = {
    ...currentRecord,
    $type: OCCURRENCE_COLLECTION,
    createdAt: currentRecord.createdAt,
    dynamicProperties: buildTreeDynamicProperties(),
  };
  delete candidate.datasetRef;
  const nextRecord = parseOccurrenceRecord({
    ...candidate,
  });

  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: OCCURRENCE_COLLECTION,
    rkey,
    swapRecord: currentRecordResponse.data.cid,
    record: nextRecord,
  });
}

async function rollbackCreatedRecords(options: {
  agent: AuthenticatedAgent;
  measurementRkey: string | null;
  occurrenceRkey: string;
}): Promise<{ ok: boolean; error: string | null; occurrenceStillExists: boolean }> {
  const { agent, measurementRkey, occurrenceRkey } = options;
  let measurementDeleteError: string | null = null;
  let occurrenceDeleteError: string | null = null;

  if (measurementRkey) {
    try {
      await deleteRecord({
        agent,
        collection: MEASUREMENT_COLLECTION,
        rkey: measurementRkey,
      });
    } catch (error) {
      measurementDeleteError =
        error instanceof Error ? error.message : "Failed to delete measurement.";
    }
  }

  if (measurementDeleteError) {
    return {
      ok: false,
      error: measurementDeleteError,
      occurrenceStillExists: true,
    };
  }

  try {
    await deleteRecord({
      agent,
      collection: OCCURRENCE_COLLECTION,
      rkey: occurrenceRkey,
    });
  } catch (error) {
    occurrenceDeleteError =
      error instanceof Error ? error.message : "Failed to delete occurrence.";
  }

  if (!measurementDeleteError && !occurrenceDeleteError) {
    return { ok: true, error: null, occurrenceStillExists: false };
  }

  const errorParts = [measurementDeleteError, occurrenceDeleteError].filter(
    (value): value is string => typeof value === "string",
  );

  return {
    ok: false,
    error: errorParts.join(" "),
    occurrenceStillExists: occurrenceDeleteError !== null,
  };
}

function upsertDetachedResult(options: {
  results: AppendExistingDatasetRowResult[];
  occurrence: PersistedOccurrence;
  error: string;
}): void {
  const { results, occurrence, error } = options;
  const existingIndex = results.findIndex((item) => item.index === occurrence.index);

  if (existingIndex === -1) {
    results.push({
      index: occurrence.index,
      state: "partial",
      occurrenceUri: occurrence.occurrenceUri,
      photoCount: 0,
      error,
    });
    return;
  }

  const existing = results[existingIndex];
  if (existing.state === "error") {
    return;
  }

  results[existingIndex] = {
    index: occurrence.index,
    state: "partial",
    occurrenceUri: occurrence.occurrenceUri,
    photoCount: existing.photoCount,
    error,
  };
}

async function detachTrackedOccurrences(options: {
  agent: AuthenticatedAgent;
  did: string;
  occurrences: PersistedOccurrence[];
  results: AppendExistingDatasetRowResult[];
}): Promise<void> {
  const { agent, did, occurrences, results } = options;

  for (const occurrence of occurrences) {
    try {
      await unsetOccurrenceDatasetAssociation({
        agent,
        did,
        rkey: occurrence.occurrenceRkey,
      });
      upsertDetachedResult({
        results,
        occurrence,
        error:
          "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager.",
      });
    } catch (error) {
      upsertDetachedResult({
        results,
        occurrence,
        error:
          "The selected dataset disappeared during upload and this tree could not be moved out of that dataset automatically. Review it in Tree Manager."
          + (error instanceof Error ? ` ${error.message}` : ""),
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.session.getSession();
  if (!hasDidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isAppendExistingDatasetRequest(body)) {
    return NextResponse.json(
      { error: "datasetRkey, validRows, and establishmentMeans are required." },
      { status: 400 },
    );
  }

  const agent = await auth.session.getAuthenticatedAgent(session.did);
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let datasetRecordResponse;
    try {
      datasetRecordResponse = await agent.com.atproto.repo.getRecord({
        repo: session.did,
        collection: DATASET_COLLECTION,
        rkey: body.datasetRkey,
      });
    } catch (error) {
      if (!isDatasetUnavailableError(error)) {
        throw error;
      }

      return NextResponse.json(
        {
          error:
            "The selected dataset is no longer available. Choose another dataset and try again.",
        },
        { status: 409 },
      );
    }
    parseDatasetRecord(datasetRecordResponse.data.value);
    const datasetUri = datasetRecordResponse.data.uri;
    let datasetBecameUnavailable = false;
    const results: AppendExistingDatasetRowResult[] = [];
    const persistedOccurrences: PersistedOccurrence[] = [];

    for (const [resultIndex, row] of body.validRows.entries()) {
      const speciesName = row.occurrence.scientificName || `Row ${row.index + 1}`;
      const occurrenceInput = occurrenceInputToCreateInput({
        ...row.occurrence,
        ...(body.establishmentMeans
          ? { establishmentMeans: body.establishmentMeans }
          : {}),
        datasetRef: datasetUri,
        dynamicProperties: buildTreeDynamicProperties(datasetUri),
      });

      try {
        const occurrence = await createOccurrenceRecord({
          agent,
          occurrenceInput,
        });
        let measurementRkey: string | null = null;

        try {
          if (row.floraMeasurement) {
            const measurement = await createMeasurementRecord({
              agent,
              occurrenceUri: occurrence.uri,
              floraMeasurement: row.floraMeasurement,
            });
            measurementRkey = measurement.rkey;
          }

          await incrementDatasetRecordCount({
            agent,
            did: session.did,
            rkey: body.datasetRkey,
            incrementBy: 1,
          });

          results.push({
            index: resultIndex,
            state: "success",
            occurrenceUri: occurrence.uri,
            photoCount: 0,
          });
          persistedOccurrences.push({
            index: resultIndex,
            occurrenceUri: occurrence.uri,
            occurrenceRkey: occurrence.rkey,
          });
        } catch (rowError) {
          const datasetUnavailable = isDatasetUnavailableError(rowError);
          if (datasetUnavailable) {
            datasetBecameUnavailable = true;
          }

          const rollback = await rollbackCreatedRecords({
            agent,
            measurementRkey,
            occurrenceRkey: occurrence.rkey,
          });

          if (rollback.ok) {
            if (datasetUnavailable) {
              await detachTrackedOccurrences({
                agent,
                did: session.did,
                occurrences: persistedOccurrences,
                results,
              });
            }

            results.push({
              index: resultIndex,
              state: "error",
              error:
                rowError instanceof Error
                  ? rowError.message
                  : `Failed to append ${speciesName}.`,
            });
            if (datasetUnavailable) {
              for (let remainingIndex = resultIndex + 1; remainingIndex < body.validRows.length; remainingIndex += 1) {
                results.push({
                  index: remainingIndex,
                  state: "error",
                  error:
                    "The selected dataset disappeared during upload. Remaining rows were not added.",
                });
              }
              break;
            }
            continue;
          }

          if (rollback.occurrenceStillExists) {
            if (datasetUnavailable) {
              await detachTrackedOccurrences({
                agent,
                did: session.did,
                occurrences: persistedOccurrences,
                results,
              });

              try {
                await unsetOccurrenceDatasetAssociation({
                  agent,
                  did: session.did,
                  rkey: occurrence.rkey,
                });

                results.push({
                  index: resultIndex,
                  state: "partial",
                  occurrenceUri: occurrence.uri,
                  photoCount: 0,
                  error:
                    "The selected dataset disappeared during upload, so this tree was kept without dataset grouping. Review it in Tree Manager."
                    + (rollback.error ? ` ${rollback.error}` : ""),
                });
              } catch (ungroupError) {
                results.push({
                  index: resultIndex,
                  state: "partial",
                  occurrenceUri: occurrence.uri,
                  photoCount: 0,
                  error:
                    "The selected dataset disappeared during upload and the tree could not be moved out of that dataset automatically. Review it in Tree Manager."
                    + (rollback.error ? ` ${rollback.error}` : "")
                    + (ungroupError instanceof Error
                      ? ` ${ungroupError.message}`
                      : ""),
                });
              }

              for (let remainingIndex = resultIndex + 1; remainingIndex < body.validRows.length; remainingIndex += 1) {
                results.push({
                  index: remainingIndex,
                  state: "error",
                  error:
                    "The selected dataset disappeared during upload. Remaining rows were not added.",
                });
              }
              break;
            }

            try {
              await incrementDatasetRecordCount({
                agent,
                did: session.did,
                rkey: body.datasetRkey,
                incrementBy: 1,
              });

              results.push({
                index: resultIndex,
                state: "partial",
                occurrenceUri: occurrence.uri,
                photoCount: 0,
                error:
                  "The tree was created, but a follow-up step failed and automatic cleanup could not finish. Review this tree in Tree Manager."
                  + (rollback.error ? ` ${rollback.error}` : ""),
              });
            } catch (countError) {
              results.push({
                index: resultIndex,
                state: "partial",
                occurrenceUri: occurrence.uri,
                photoCount: 0,
                error:
                  "The tree was created, but cleanup and dataset count reconciliation could not finish automatically. Review this tree in Tree Manager."
                  + (rollback.error ? ` ${rollback.error}` : "")
                  + (countError instanceof Error ? ` ${countError.message}` : ""),
              });
            }
            continue;
          }

          results.push({
            index: resultIndex,
            state: "error",
            error:
              "The tree upload failed and some cleanup could not finish automatically."
              + (rollback.error ? ` ${rollback.error}` : ""),
          });
        }
      } catch (error) {
        results.push({
          index: resultIndex,
          state: "error",
          error:
            error instanceof Error ? error.message : `Failed to append ${speciesName}.`,
        });
      }
    }

    return NextResponse.json({
      datasetUri,
      datasetRkey: body.datasetRkey,
      datasetBecameUnavailable,
      results,
    } satisfies AppendExistingDatasetResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to append upload to dataset: ${message}` },
      { status: 500 },
    );
  }
}
