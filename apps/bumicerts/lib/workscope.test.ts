import { describe, expect, test } from "bun:test";
import { $parse as parseClaimActivity } from "@gainforest/generated/org/hypercerts/claim/activity.defs";
import { $parse as parseWorkscopeCel } from "@gainforest/generated/org/hypercerts/workscope/cel.defs";
import {
  WORKSCOPE_OPTIONS,
  buildWorkscopeCel,
  extractWorkScopeObjectives,
} from "./workscope";

describe("buildWorkscopeCel", () => {
  test("builds a lexicon-valid CEL work scope for selected work types", () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    const workScope = buildWorkscopeCel(
      WORKSCOPE_OPTIONS.map((option) => option.value),
      createdAt,
    );

    expect(parseWorkscopeCel(workScope)).toEqual(workScope);
    expect(
      parseClaimActivity({
        $type: "org.hypercerts.claim.activity",
        title: "Test activity",
        shortDescription: "Test activity",
        workScope,
        createdAt: createdAt.toISOString(),
      }).workScope,
    ).toMatchObject({
      $type: "org.hypercerts.workscope.cel",
      expression: workScope.expression,
      usedTags: workScope.usedTags,
      version: workScope.version,
      createdAt: workScope.createdAt,
    });
    expect(workScope.$type).toBe("org.hypercerts.workscope.cel");
    expect(workScope.expression).toBe(
      'scope.hasAll(["ecological_restoration","agroforestry","climate_adaptation","biodiversity_monitoring","environmental_education","indigenous_local_knowledge","environmental_justice"])',
    );
    expect(workScope.usedTags).toEqual([]);
    expect(workScope.version).toBe("v1");
    expect(workScope.createdAt).toBe(createdAt.toISOString());
    expect("scope" in workScope).toBe(false);
  });

  test("deduplicates selected work types while preserving order", () => {
    const workScope = buildWorkscopeCel([
      "Agroforestry",
      "Ecological Restoration",
      "Agroforestry",
    ]);

    expect(workScope.expression).toBe(
      'scope.hasAll(["agroforestry","ecological_restoration"])',
    );
  });
});

describe("extractWorkScopeObjectives", () => {
  test("extracts objectives from comma-separated work scope strings", () => {
    expect(
      extractWorkScopeObjectives({
        $type: "org.hypercerts.claim.activity#workScopeString",
        scope: "Ecological Restoration, Agroforestry",
      }),
    ).toEqual(["Ecological Restoration", "Agroforestry"]);
  });

  test("extracts objectives from CEL work scope expressions", () => {
    const workScope = buildWorkscopeCel([
      "Biodiversity Monitoring",
      "Environmental Education",
    ]);

    expect(extractWorkScopeObjectives(workScope)).toEqual([
      "Biodiversity Monitoring",
      "Environmental Education",
    ]);
  });
});
