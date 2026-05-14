import { Effect } from "effect";
import { validateGeojsonOrThrow } from "../../../geojson/validate";
import { computePolygonMetrics } from "../../../geojson/computations";
import { GeoJsonValidationError, GeoJsonProcessingError } from "../../../geojson/errors";
import { fromSerializableFile } from "../../../blob/types";
import type { SerializableFile } from "../../../blob/types";
import type { GeoJsonObject } from "geojson";

export type GeoJsonMetrics = {
  /** Latitude of centroid to 6 decimal places */
  lat: string;
  /** Longitude of centroid to 6 decimal places */
  lon: string;
  /** Area in hectares to 2 decimal places */
  area: string;
};

export const validateSerializableGeoJsonFile = (
  file: SerializableFile
): Effect.Effect<GeoJsonObject, GeoJsonValidationError> =>
  Effect.gen(function* () {
    if (file.type !== "application/geo+json") {
      return yield* Effect.fail(
        new GeoJsonValidationError({
          message: `Expected MIME type "application/geo+json", got "${file.type}"`,
        })
      );
    }

    const bytes = fromSerializableFile(file);
    const text = new TextDecoder().decode(bytes);

    const parsed = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (cause) =>
        new GeoJsonValidationError({ message: `Invalid JSON in GeoJSON file: ${String(cause)}`, cause }),
    });

    return yield* Effect.try({
      try: () => validateGeojsonOrThrow(parsed),
      catch: (cause) =>
        new GeoJsonValidationError({ message: `Invalid GeoJSON: ${String(cause)}`, cause }),
    });
  });

export const processGeoJsonObject = (
  geoJson: GeoJsonObject
): Effect.Effect<GeoJsonMetrics, GeoJsonProcessingError> =>
  Effect.gen(function* () {
    const metrics = computePolygonMetrics(geoJson);

    const lat = metrics.centroid?.lat;
    const lon = metrics.centroid?.lon;
    const area = metrics.areaHectares;

    if (lat === undefined || lat === null || lon === undefined || lon === null || !area) {
      return yield* Effect.fail(
        new GeoJsonProcessingError({
          message: `GeoJSON does not contain polygon geometry with computable area. ${metrics.message}`,
        })
      );
    }

    return {
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      area: area.toFixed(2),
    };
  });

/**
 * Validate and process a SerializableFile containing GeoJSON.
 *
 * 1. Validates MIME type is application/geo+json
 * 2. Parses and structurally validates the GeoJSON
 * 3. Computes polygon metrics (centroid lat/lon, area in hectares)
 *
 * Fails if the file is not valid GeoJSON or the geometry cannot produce metrics.
 */
export const processGeoJsonFile = (
  file: SerializableFile
): Effect.Effect<GeoJsonMetrics, GeoJsonValidationError | GeoJsonProcessingError> =>
  Effect.gen(function* () {
    const geoJson = yield* validateSerializableGeoJsonFile(file);
    return yield* processGeoJsonObject(geoJson);
  });
