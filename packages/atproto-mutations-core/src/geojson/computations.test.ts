import { describe, expect, test } from "bun:test";
import type { MultiPolygon, Point, Polygon } from "geojson";
import { classifyPointAgainstGeoJsonBoundary } from "./computations";

const SQUARE_GEOJSON = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, 0],
      ],
    ],
  },
} as const;

describe("classifyPointAgainstGeoJsonBoundary", () => {
  test("treats points inside a polygon as inside", () => {
    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: SQUARE_GEOJSON,
      point: { lat: 0.0005, lon: 0.0005 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("inside");
  });

  test("treats points exactly on the polygon boundary as inside", () => {
    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: SQUARE_GEOJSON,
      point: { lat: 0.0005, lon: 0.001 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("inside");
  });

  test("labels outside points within the review band as near-boundary", () => {
    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: SQUARE_GEOJSON,
      point: { lat: 0.0005, lon: 0.0011 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("near-boundary");
  });

  test("labels outside points beyond the review band as outside", () => {
    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: SQUARE_GEOJSON,
      point: { lat: 0.0005, lon: 0.0013 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("outside");
  });

  test("accepts closed LineString boundaries as polygons", () => {
    const closedLineStringBoundary = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0.001, 0],
          [0.001, 0.001],
          [0, 0.001],
          [0, 0],
        ],
      },
    } as const;

    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: closedLineStringBoundary,
      point: { lat: 0.0005, lon: 0.0005 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("inside");
  });

  test("treats points inside any MultiPolygon polygon as inside", () => {
    const multiPolygon: MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [0.001, 0],
            [0.001, 0.001],
            [0, 0.001],
            [0, 0],
          ],
        ],
        [
          [
            [1, 1],
            [1.001, 1],
            [1.001, 1.001],
            [1, 1.001],
            [1, 1],
          ],
        ],
      ],
    };

    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: multiPolygon,
      point: { lat: 1.0005, lon: 1.0005 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("inside");
  });

  test("treats points inside polygon holes as outside", () => {
    const polygonWithHole: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0.01, 0],
          [0.01, 0.01],
          [0, 0.01],
          [0, 0],
        ],
        [
          [0.002, 0.002],
          [0.004, 0.002],
          [0.004, 0.004],
          [0.002, 0.004],
          [0.002, 0.002],
        ],
      ],
    };

    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: polygonWithHole,
      point: { lat: 0.003, lon: 0.003 },
      nearBoundaryMeters: 1,
    });

    expect(result.kind).toBe("outside");
  });

  test("reports GeoJSON without polygons as invalid boundary", () => {
    const pointGeoJson: Point = {
      type: "Point",
      coordinates: [0, 0],
    };

    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: pointGeoJson,
      point: { lat: 0, lon: 0 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("invalid-boundary");
  });

  test("reports malformed polygon rings as invalid boundary", () => {
    const malformedPolygon: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0.001, 0],
          [0.001, 0.001],
        ],
      ],
    };

    const result = classifyPointAgainstGeoJsonBoundary({
      geoJson: malformedPolygon,
      point: { lat: 0.0005, lon: 0.0005 },
      nearBoundaryMeters: 15,
    });

    expect(result.kind).toBe("invalid-boundary");
  });
});
