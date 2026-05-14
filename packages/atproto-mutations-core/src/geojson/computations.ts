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

export type PointBoundaryClassification =
  | {
      kind: "inside";
      distanceMeters: 0;
    }
  | {
      kind: "near-boundary";
      distanceMeters: number;
    }
  | {
      kind: "outside";
      distanceMeters: number;
    }
  | {
      kind: "invalid-boundary";
      reason: string;
    };

export const HECTARES_PER_SQUARE_METER = 0.0001;

const EARTH_RADIUS_METERS = 6_371_008.8;
const BOUNDARY_EPSILON_METERS = 0.01;

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

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const normalizePosition = (position: Position): [number, number] | null => {
  const lon = position[0];
  const lat = position[1];

  if (
    typeof lon !== "number" ||
    typeof lat !== "number" ||
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    lon < -180 ||
    lon > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    return null;
  }

  return [lon, lat];
};

const positionsMatch = (a: [number, number], b: [number, number]): boolean =>
  a[0] === b[0] && a[1] === b[1];

const getInvalidRingReason = (ring: Position[]): string | null => {
  if (ring.length < 4) {
    return "Polygon linear rings must contain at least four positions.";
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const firstPosition = first ? normalizePosition(first) : null;
  const lastPosition = last ? normalizePosition(last) : null;

  if (!firstPosition || !lastPosition) {
    return "Polygon linear rings contain invalid positions.";
  }

  if (!positionsMatch(firstPosition, lastPosition)) {
    return "Polygon linear rings must be closed.";
  }

  for (const position of ring) {
    if (!normalizePosition(position)) {
      return "Polygon linear rings contain invalid positions.";
    }
  }

  return null;
};

const getInvalidPolygonRingsReason = (rings: Position[][]): string | null => {
  if (rings.length === 0) {
    return "Polygon geometry must contain at least one linear ring.";
  }

  for (const ring of rings) {
    const reason = getInvalidRingReason(ring);
    if (reason) {
      return reason;
    }
  }

  return null;
};

const toLocalMeters = (
  position: [number, number],
  origin: Coordinates,
): { x: number; y: number } => {
  const [lon, lat] = position;
  const originLatRad = degreesToRadians(origin.lat);

  return {
    x:
      EARTH_RADIUS_METERS *
      degreesToRadians(lon - origin.lon) *
      Math.cos(originLatRad),
    y: EARTH_RADIUS_METERS * degreesToRadians(lat - origin.lat),
  };
};

const distancePointToSegmentMeters = (
  point: Coordinates,
  start: [number, number],
  end: [number, number],
): number => {
  const p = { x: 0, y: 0 };
  const a = toLocalMeters(start, point);
  const b = toLocalMeters(end, point);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
  );
  const projected = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };

  return Math.hypot(p.x - projected.x, p.y - projected.y);
};

const distancePointToRingMeters = (
  point: Coordinates,
  ring: Position[],
): number | null => {
  let minDistance: number | null = null;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    if (!start || !end) {
      continue;
    }

    const normalizedStart = normalizePosition(start);
    const normalizedEnd = normalizePosition(end);
    if (!normalizedStart || !normalizedEnd) {
      continue;
    }

    const distance = distancePointToSegmentMeters(
      point,
      normalizedStart,
      normalizedEnd,
    );
    minDistance = minDistance === null ? distance : Math.min(minDistance, distance);
  }

  return minDistance;
};

const isPointInRing = (point: Coordinates, ring: Position[]): boolean => {
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const current = ring[index];
    const previous = ring[previousIndex];
    if (!current || !previous) {
      continue;
    }

    const currentPosition = normalizePosition(current);
    const previousPosition = normalizePosition(previous);
    if (!currentPosition || !previousPosition) {
      continue;
    }

    const [currentLon, currentLat] = currentPosition;
    const [previousLon, previousLat] = previousPosition;
    const crossesLatitude = currentLat > point.lat !== previousLat > point.lat;

    if (!crossesLatitude) {
      continue;
    }

    const intersectionLon =
      ((previousLon - currentLon) * (point.lat - currentLat)) /
        (previousLat - currentLat) +
      currentLon;

    if (point.lon < intersectionLon) {
      inside = !inside;
    }
  }

  return inside;
};

const getPolygonDistanceAndContainment = (
  point: Coordinates,
  rings: Position[][],
): { inside: boolean; distanceMeters: number | null } => {
  const outerRing = rings[0];
  if (!outerRing) {
    return { inside: false, distanceMeters: null };
  }

  let minDistance: number | null = null;
  for (const ring of rings) {
    const ringDistance = distancePointToRingMeters(point, ring);
    if (ringDistance === null) {
      continue;
    }

    minDistance =
      minDistance === null ? ringDistance : Math.min(minDistance, ringDistance);
  }

  if (minDistance !== null && minDistance <= BOUNDARY_EPSILON_METERS) {
    return { inside: true, distanceMeters: 0 };
  }

  const insideOuterRing = isPointInRing(point, outerRing);
  const insideHole = rings.slice(1).some((ring) => isPointInRing(point, ring));

  return {
    inside: insideOuterRing && !insideHole,
    distanceMeters: minDistance,
  };
};

export const classifyPointAgainstGeoJsonBoundary = (options: {
  geoJson: GeoJsonObject;
  point: Coordinates;
  nearBoundaryMeters: number;
}): PointBoundaryClassification => {
  if (
    !Number.isFinite(options.point.lat) ||
    !Number.isFinite(options.point.lon) ||
    options.point.lat < -90 ||
    options.point.lat > 90 ||
    options.point.lon < -180 ||
    options.point.lon > 180
  ) {
    return {
      kind: "invalid-boundary",
      reason: "Point coordinates are invalid.",
    };
  }

  const polygonFeatures = extractPolygonFeatures(options.geoJson);

  if (polygonFeatures.length === 0) {
    return {
      kind: "invalid-boundary",
      reason: "GeoJSON does not contain polygon geometry.",
    };
  }

  let minDistance: number | null = null;
  for (const feature of polygonFeatures) {
    const geometry = feature.geometry;
    const polygons =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

    for (const rings of polygons) {
      const invalidRingsReason = getInvalidPolygonRingsReason(rings);
      if (invalidRingsReason) {
        return {
          kind: "invalid-boundary",
          reason: invalidRingsReason,
        };
      }

      const result = getPolygonDistanceAndContainment(options.point, rings);
      if (result.inside) {
        return { kind: "inside", distanceMeters: 0 };
      }

      if (result.distanceMeters === null) {
        continue;
      }

      minDistance =
        minDistance === null
          ? result.distanceMeters
          : Math.min(minDistance, result.distanceMeters);
    }
  }

  if (minDistance === null) {
    return {
      kind: "invalid-boundary",
      reason: "GeoJSON polygon boundary could not be measured.",
    };
  }

  if (minDistance <= options.nearBoundaryMeters) {
    return { kind: "near-boundary", distanceMeters: minDistance };
  }

  return { kind: "outside", distanceMeters: minDistance };
};

export const toFeatureCollection = (geoJson: GeoJsonObject): FeatureCollection => {
  if (isFeatureCollection(geoJson)) return geoJson;
  if (isFeature(geoJson)) return featureCollection([geoJson]);
  return featureCollection([toFeature(geoJson as Geometry)]);
};
