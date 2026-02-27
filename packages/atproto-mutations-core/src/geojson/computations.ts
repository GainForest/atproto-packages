import type {
  Feature,
  FeatureCollection,
  GeoJsonObject,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";
import {
  area as turfArea,
  bbox as turfBbox,
  centerOfMass,
  centroid as turfCentroid,
  featureCollection,
  length as turfLength,
} from "@turf/turf";

export type Coordinates = {
  lat: number;
  lon: number;
};

export type PolygonMetrics = {
  areaSqMeters: number | null;
  areaHectares: number | null;
  centroid: Coordinates | null;
  bbox: [number, number, number, number] | null;
  message: string;
};

export const HECTARES_PER_SQUARE_METER = 0.0001;

const isFeatureCollection = (v: GeoJsonObject): v is FeatureCollection =>
  v.type === "FeatureCollection";

const isFeature = (v: GeoJsonObject): v is Feature => v.type === "Feature";

const isGeometryCollection = (v: Geometry): v is GeometryCollection =>
  v.type === "GeometryCollection";

const isPolygon = (v: Geometry): v is Polygon => v.type === "Polygon";
const isMultiPolygon = (v: Geometry): v is MultiPolygon =>
  v.type === "MultiPolygon";
const isLineString = (v: Geometry): v is LineString => v.type === "LineString";
const isMultiLineString = (v: Geometry): v is MultiLineString =>
  v.type === "MultiLineString";
const isPoint = (v: Geometry): v is Point => v.type === "Point";
const isMultiPoint = (v: Geometry): v is MultiPoint =>
  v.type === "MultiPoint";

const isLineStringClosed = (ls: LineString): boolean => {
  const coords = ls.coordinates;
  if (coords.length < 4) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (!first || !last || first.length < 2 || last.length < 2) return false;
  const [fLon, fLat] = first;
  const [lLon, lLat] = last;
  if (fLon === undefined || fLat === undefined || lLon === undefined || lLat === undefined)
    return false;
  const tol = 1e-10;
  return Math.abs(fLon - lLon) < tol && Math.abs(fLat - lLat) < tol;
};

const lineStringToPolygon = (ls: LineString): Polygon | null => {
  if (!isLineStringClosed(ls)) return null;
  return { type: "Polygon", coordinates: [ls.coordinates] };
};

const toFeature = (geometry: Geometry): Feature<Geometry> => ({
  type: "Feature",
  geometry,
  properties: {},
});

export const extractPolygonFeatures = (
  input: GeoJsonObject
): Feature<Polygon | MultiPolygon>[] => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractPolygonFeatures(f));
  }
  if (isFeature(input)) {
    const g = input.geometry;
    if (!g) return [];
    if (isGeometryCollection(g))
      return g.geometries.flatMap((sub) => extractPolygonFeatures(toFeature(sub)));
    if (isPolygon(g) || isMultiPolygon(g))
      return [input as Feature<Polygon | MultiPolygon>];
    return [];
  }
  const g = input as Geometry;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractPolygonFeatures(toFeature(sub)));
  if (isPolygon(g) || isMultiPolygon(g))
    return [toFeature(g) as Feature<Polygon | MultiPolygon>];
  return [];
};

export const extractLineStringFeatures = (
  input: GeoJsonObject
): Feature<LineString | MultiLineString>[] => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractLineStringFeatures(f));
  }
  if (isFeature(input)) {
    const g = input.geometry;
    if (!g) return [];
    if (isGeometryCollection(g))
      return g.geometries.flatMap((sub) => extractLineStringFeatures(toFeature(sub)));
    if (isLineString(g) || isMultiLineString(g))
      return [input as Feature<LineString | MultiLineString>];
    return [];
  }
  const g = input as Geometry;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractLineStringFeatures(toFeature(sub)));
  if (isLineString(g) || isMultiLineString(g))
    return [toFeature(g) as Feature<LineString | MultiLineString>];
  return [];
};

export const extractPointFeatures = (
  input: GeoJsonObject
): Feature<Point | MultiPoint>[] => {
  if (isFeatureCollection(input)) {
    return input.features.flatMap((f) => extractPointFeatures(f));
  }
  if (isFeature(input)) {
    const g = input.geometry;
    if (!g) return [];
    if (isGeometryCollection(g))
      return g.geometries.flatMap((sub) => extractPointFeatures(toFeature(sub)));
    if (isPoint(g) || isMultiPoint(g)) return [input as Feature<Point | MultiPoint>];
    return [];
  }
  const g = input as Geometry;
  if (isGeometryCollection(g))
    return g.geometries.flatMap((sub) => extractPointFeatures(toFeature(sub)));
  if (isPoint(g) || isMultiPoint(g))
    return [toFeature(g) as Feature<Point | MultiPoint>];
  return [];
};

const computeCentroidPosition = (
  features: Feature<Geometry>[]
): Position | null => {
  if (features.length === 0) return null;
  const col = featureCollection(features);
  try {
    return centerOfMass(col).geometry.coordinates;
  } catch {
    try {
      return turfCentroid(col).geometry.coordinates;
    } catch {
      return null;
    }
  }
};

const positionToCoords = (pos: Position | null): Coordinates | null => {
  if (!pos || pos[0] === undefined || pos[1] === undefined) return null;
  return { lat: pos[1], lon: pos[0] };
};

export const computePolygonMetrics = (geoJson: GeoJsonObject): PolygonMetrics => {
  const polygonFeatures = extractPolygonFeatures(geoJson);
  const lineStringFeatures = extractLineStringFeatures(geoJson);
  const pointFeatures = extractPointFeatures(geoJson);

  // Convert closed LineStrings to Polygons
  const convertedPolygons: Feature<Polygon>[] = [];
  for (const lsf of lineStringFeatures) {
    if (lsf.geometry.type === "LineString") {
      const poly = lineStringToPolygon(lsf.geometry);
      if (poly) convertedPolygons.push({ type: "Feature", geometry: poly, properties: lsf.properties });
    } else if (lsf.geometry.type === "MultiLineString") {
      for (const coords of lsf.geometry.coordinates) {
        const ls: LineString = { type: "LineString", coordinates: coords };
        const poly = lineStringToPolygon(ls);
        if (poly) convertedPolygons.push({ type: "Feature", geometry: poly, properties: lsf.properties });
      }
    }
  }

  const allPolygonFeatures = [...polygonFeatures, ...convertedPolygons];

  // Points only
  if (pointFeatures.length > 0 && allPolygonFeatures.length === 0 && lineStringFeatures.length === 0) {
    const centroid = positionToCoords(computeCentroidPosition(pointFeatures as Feature<Geometry>[]));
    const bbox = turfBbox(featureCollection(pointFeatures)) as [number, number, number, number];
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid,
      bbox,
      message: centroid ? "Success (Point)" : "Centroid calculation failed",
    };
  }

  // LineStrings only (open)
  if (lineStringFeatures.length > 0 && allPolygonFeatures.length === 0) {
    const centroid = positionToCoords(
      computeCentroidPosition(lineStringFeatures as Feature<Geometry>[])
    );
    const bbox = turfBbox(featureCollection(lineStringFeatures)) as [number, number, number, number];
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid,
      bbox,
      message: centroid ? "Success (LineString)" : "Centroid calculation failed",
    };
  }

  // Mixed geometries
  const hasPolygons = allPolygonFeatures.length > 0;
  const hasLineStrings = lineStringFeatures.length > 0;
  const hasPoints = pointFeatures.length > 0;
  const typeCount = (hasPolygons ? 1 : 0) + (hasLineStrings ? 1 : 0) + (hasPoints ? 1 : 0);

  if (typeCount > 1) {
    const areaSqMeters = allPolygonFeatures.reduce((acc, f) => acc + turfArea(f), 0);
    const allFeatures = [
      ...allPolygonFeatures,
      ...lineStringFeatures,
      ...pointFeatures,
    ] as Feature<Geometry>[];
    const centroid = positionToCoords(computeCentroidPosition(allFeatures));
    const bbox = turfBbox(featureCollection(allFeatures)) as [number, number, number, number];
    const labels = [
      ...(hasPolygons ? ["Polygon"] : []),
      ...(hasLineStrings ? ["LineString"] : []),
      ...(hasPoints ? ["Point"] : []),
    ];
    return {
      areaSqMeters,
      areaHectares: areaSqMeters * HECTARES_PER_SQUARE_METER,
      centroid,
      bbox,
      message: centroid ? `Success (mixed: ${labels.join(", ")})` : "Centroid calculation failed",
    };
  }

  // No geometries
  if (allPolygonFeatures.length === 0) {
    return {
      areaSqMeters: null,
      areaHectares: null,
      centroid: null,
      bbox: null,
      message: "No polygons found",
    };
  }

  // Polygons only
  const areaSqMeters = allPolygonFeatures.reduce((acc, f) => acc + turfArea(f), 0);
  const centroid = positionToCoords(
    computeCentroidPosition(allPolygonFeatures as Feature<Geometry>[])
  );
  const bbox = turfBbox(featureCollection(allPolygonFeatures)) as [number, number, number, number];

  return {
    areaSqMeters,
    areaHectares: areaSqMeters * HECTARES_PER_SQUARE_METER,
    centroid,
    bbox,
    message: centroid ? "Success" : "Centroid calculation failed",
  };
};

export const toFeatureCollection = (geoJson: GeoJsonObject): FeatureCollection => {
  if (isFeatureCollection(geoJson)) return geoJson;
  if (isFeature(geoJson)) return featureCollection([geoJson]);
  return featureCollection([toFeature(geoJson as Geometry)]);
};
