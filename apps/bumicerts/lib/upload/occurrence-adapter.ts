import type { OccurrenceInput } from "./types";
import type { CreateDwcOccurrenceInput } from "@gainforest/atproto-mutations-next";
import { isAtUriString } from "@atproto/lex";

function toAtUriString(
  value: string,
  fieldName: string,
): NonNullable<CreateDwcOccurrenceInput["siteRef"]> {
  if (!isAtUriString(value)) {
    throw new Error(`${fieldName} must be a valid AT-URI.`);
  }

  return value;
}

/**
 * Adapter: converts an OccurrenceInput (app-layer, lat/lon as number) into
 * the shape expected by the tRPC dwc.occurrence.create mutation
 * (CreateDwcOccurrenceInput, lat/lon as string for ATProto PDS storage).
 *
 * This is the single, explicit conversion point between the bumicerts MANAGE
 * domain model and the mutations-core API. Any future caller that needs to
 * pass an OccurrenceInput to createDwcOccurrence should go through here.
 */
export function occurrenceInputToCreateInput(
  occurrence: OccurrenceInput,
): CreateDwcOccurrenceInput {
  const input: CreateDwcOccurrenceInput = {
    scientificName: occurrence.scientificName,
    eventDate: occurrence.eventDate,
    basisOfRecord: occurrence.basisOfRecord ?? "HumanObservation",
    // Explicit conversion: OccurrenceInput stores lat/lon as number for
    // numeric validation; CreateDwcOccurrenceInput stores them as string
    // because ATProto lexicon defines them as string fields.
    decimalLatitude: String(occurrence.decimalLatitude),
    decimalLongitude: String(occurrence.decimalLongitude),
  };

  if (occurrence.basisOfRecord !== undefined)
    input.basisOfRecord = occurrence.basisOfRecord;
  if (occurrence.vernacularName !== undefined)
    input.vernacularName = occurrence.vernacularName;
  if (occurrence.recordedBy !== undefined)
    input.recordedBy = occurrence.recordedBy;
  if (occurrence.locality !== undefined) input.locality = occurrence.locality;
  if (occurrence.country !== undefined) input.country = occurrence.country;
  if (occurrence.countryCode !== undefined)
    input.countryCode = occurrence.countryCode;
  if (occurrence.occurrenceRemarks !== undefined)
    input.occurrenceRemarks = occurrence.occurrenceRemarks;
  if (occurrence.habitat !== undefined) input.habitat = occurrence.habitat;
  if (occurrence.samplingProtocol !== undefined)
    input.samplingProtocol = occurrence.samplingProtocol;
  if (occurrence.kingdom !== undefined) input.kingdom = occurrence.kingdom;
  if (occurrence.siteRef !== undefined)
    input.siteRef = toAtUriString(occurrence.siteRef, "siteRef");
  if (occurrence.datasetRef !== undefined)
    input.datasetRef = toAtUriString(occurrence.datasetRef, "datasetRef");
  if (occurrence.dynamicProperties !== undefined)
    input.dynamicProperties = occurrence.dynamicProperties;

  return input;
}
