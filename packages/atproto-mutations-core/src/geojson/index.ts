export { validateGeojsonOrThrow } from "./validate";
export {
  computePolygonMetrics,
  extractPolygonFeatures,
  extractLineStringFeatures,
  extractPointFeatures,
  classifyPointAgainstGeoJsonBoundary,
  toFeatureCollection,
  HECTARES_PER_SQUARE_METER,
} from "./computations";
export type {
  Coordinates,
  PointBoundaryClassification,
  PolygonMetrics,
} from "./computations";
export { GeoJsonValidationError, GeoJsonProcessingError } from "./errors";
