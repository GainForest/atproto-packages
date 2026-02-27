import type { GeoJsonObject } from "geojson";

/**
 * Validates if an unknown object is a valid GeoJSON object.
 * Throws a descriptive Error if validation fails.
 * Ported from climateai-sdk's _internal/lib/geojson/validate.ts.
 */
export function validateGeojsonOrThrow(value: unknown): GeoJsonObject {
  if (value === null || typeof value !== "object") {
    throw new Error("GeoJSON must be an object");
  }

  const obj = value as Record<string, unknown>;

  if (!("type" in obj) || typeof obj.type !== "string") {
    throw new Error("GeoJSON must have a 'type' property of type string");
  }

  const type = obj.type;

  if (type === "FeatureCollection") {
    if (!("features" in obj) || !Array.isArray(obj.features)) {
      throw new Error(
        "FeatureCollection must have a 'features' property of type array"
      );
    }
    for (let i = 0; i < obj.features.length; i++) {
      try {
        validateGeojsonOrThrow(obj.features[i]);
      } catch (error) {
        throw new Error(
          `FeatureCollection.features[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return obj as unknown as GeoJsonObject;
  }

  if (type === "Feature") {
    if (!("geometry" in obj)) {
      throw new Error("Feature must have a 'geometry' property");
    }
    if (obj.geometry !== null) {
      try {
        validateGeometry(obj.geometry);
      } catch (error) {
        throw new Error(
          `Feature.geometry is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (!("properties" in obj)) {
      throw new Error("Feature must have a 'properties' property");
    }
    if (obj.properties !== null && typeof obj.properties !== "object") {
      throw new Error("Feature.properties must be an object or null");
    }
    return obj as unknown as GeoJsonObject;
  }

  try {
    validateGeometry(obj);
    return obj as unknown as GeoJsonObject;
  } catch (error) {
    throw new Error(
      `Invalid GeoJSON type '${type}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function validateGeometry(value: unknown): void {
  if (value === null || typeof value !== "object") {
    throw new Error("Geometry must be an object");
  }

  const geometry = value as Record<string, unknown>;

  if (!("type" in geometry) || typeof geometry.type !== "string") {
    throw new Error("Geometry must have a 'type' property of type string");
  }

  const type = geometry.type;

  if (type === "GeometryCollection") {
    if (!("geometries" in geometry) || !Array.isArray(geometry.geometries)) {
      throw new Error(
        "GeometryCollection must have a 'geometries' property of type array"
      );
    }
    for (let i = 0; i < geometry.geometries.length; i++) {
      try {
        validateGeometry(geometry.geometries[i]);
      } catch (error) {
        throw new Error(
          `GeometryCollection.geometries[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return;
  }

  const coordinateGeometries = [
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
  ];

  if (coordinateGeometries.includes(type)) {
    if (!("coordinates" in geometry)) {
      throw new Error(`${type} must have a 'coordinates' property`);
    }
    validateCoordinates(geometry.coordinates, type);
    return;
  }

  throw new Error(`Unknown geometry type: ${type}`);
}

function validateCoordinates(coordinates: unknown, type: string): void {
  if (!Array.isArray(coordinates)) {
    throw new Error("Coordinates must be an array");
  }
  switch (type) {
    case "Point":
      validatePosition(coordinates);
      break;
    case "LineString":
      validateLineString(coordinates);
      break;
    case "Polygon":
      validatePolygon(coordinates);
      break;
    case "MultiPoint":
      validateMultiPoint(coordinates);
      break;
    case "MultiLineString":
      validateMultiLineString(coordinates);
      break;
    case "MultiPolygon":
      validateMultiPolygon(coordinates);
      break;
  }
}

function validatePosition(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("Position must be an array");
  }
  if (value.length < 2) {
    throw new Error("Position must have at least 2 elements (longitude, latitude)");
  }
  if (typeof value[0] !== "number" || typeof value[1] !== "number") {
    throw new Error("Position must have numbers for longitude and latitude");
  }
  if (value.length > 2 && typeof value[2] !== "number") {
    throw new Error("Position elevation (3rd element) must be a number if present");
  }
  if (value[0] < -180 || value[0] > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  if (value[1] < -90 || value[1] > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
}

function validateLineString(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("LineString must be an array");
  if (value.length < 2) throw new Error("LineString must have at least 2 positions");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `LineString[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function validatePolygon(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("Polygon must be an array");
  if (value.length === 0) throw new Error("Polygon must have at least one LinearRing");
  for (let i = 0; i < value.length; i++) {
    try {
      validateLinearRing(value[i]);
    } catch (error) {
      throw new Error(
        `Polygon[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function validateLinearRing(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("LinearRing must be an array");
  if (value.length < 4) throw new Error("LinearRing must have at least 4 positions");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `LinearRing[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  const first = value[0] as number[];
  const last = value[value.length - 1] as number[];
  if (
    first[0] !== last[0] ||
    first[1] !== last[1] ||
    (first.length > 2 && first[2] !== last[2])
  ) {
    throw new Error(
      "LinearRing must be closed (first and last positions must be equal)"
    );
  }
}

function validateMultiPoint(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("MultiPoint must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePosition(value[i]);
    } catch (error) {
      throw new Error(
        `MultiPoint[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function validateMultiLineString(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("MultiLineString must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validateLineString(value[i]);
    } catch (error) {
      throw new Error(
        `MultiLineString[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function validateMultiPolygon(value: unknown): void {
  if (!Array.isArray(value)) throw new Error("MultiPolygon must be an array");
  for (let i = 0; i < value.length; i++) {
    try {
      validatePolygon(value[i]);
    } catch (error) {
      throw new Error(
        `MultiPolygon[${i}] is invalid: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
