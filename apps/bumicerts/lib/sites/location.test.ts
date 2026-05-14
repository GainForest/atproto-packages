import { describe, expect, test } from "bun:test";
import { extractInlineSiteCoordinate } from "./location";

describe("extractInlineSiteCoordinate", () => {
  test("extracts decimal coordinate strings", () => {
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "9.75,-4.63" },
        "coordinate-decimal",
      ),
    ).toEqual({ lat: 9.75, lon: -4.63 });
  });

  test("rejects coordinate strings with extra comma-separated values", () => {
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "9.75,-4.63,1" },
        "coordinate-decimal",
      ),
    ).toBeNull();
  });

  test("rejects partial numeric and out-of-range coordinate strings", () => {
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: " , -4.63" },
        "coordinate-decimal",
      ),
    ).toBeNull();
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "9.75abc,-4.63" },
        "coordinate-decimal",
      ),
    ).toBeNull();
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "91,-4.63" },
        "coordinate-decimal",
      ),
    ).toBeNull();
  });

  test("rejects non-finite coordinate strings", () => {
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "Infinity,-4.63" },
        "coordinate-decimal",
      ),
    ).toBeNull();
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "9.75,NaN" },
        "coordinate-decimal",
      ),
    ).toBeNull();
  });

  test("rejects out-of-range longitudes", () => {
    expect(
      extractInlineSiteCoordinate(
        { $type: "app.certified.location#string", string: "9.75,181" },
        "coordinate-decimal",
      ),
    ).toBeNull();
  });
});
