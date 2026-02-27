import { Effect } from "effect";
import { validateGeojsonOrThrow } from "../../../geojson/validate";
import { computePolygonMetrics } from "../../../geojson/computations";
import { GeoJsonValidationError, GeoJsonProcessingError } from "../../../geojson/errors";
import { fromSerializableFile } from "../../../blob/types";
import type { SerializableFile } from "../../../blob/types";

export type GeoJsonMetrics = {
  /** Latitude of centroid to 6 decimal places */
  lat: string;
  /** Longitude of centroid to 6 decimal places */
  lon: string;
  /** Area in hectares to 2 decimal places */
  area: string;
};

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
    if (file.type !== "application/geo+json") {
      return yield* Effect.fail(
        new GeoJsonValidationError({
          message: `Expected MIME type "application/geo+json", got "${file.type}"`,
        })
      );
    }

    // Decode base64 → text
    const bytes = fromSerializableFile(file);
    const text = new TextDecoder().decode(bytes);

    // Parse JSON
    const parsed = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (cause) =>
        new GeoJsonValidationError({ message: `Invalid JSON in GeoJSON file: ${String(cause)}`, cause }),
    });

    // Structural GeoJSON validation
    const geoJson = yield* Effect.try({
      try: () => validateGeojsonOrThrow(parsed),
      catch: (cause) =>
        new GeoJsonValidationError({ message: `Invalid GeoJSON: ${String(cause)}`, cause }),
    });

    // Compute metrics
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
