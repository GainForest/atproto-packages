import { describe, expect, test } from "bun:test";
import {
  parseManageMode,
  resolveDashboardMode,
  shouldClearDashboardMode,
} from "./uploadDashboardMode";

describe("parseManageMode", () => {
  test("accepts only supported /upload mode values", () => {
    expect(parseManageMode("edit")).toBe("edit");
    expect(parseManageMode("onboard-user")).toBe("onboard-user");
    expect(parseManageMode("invalid")).toBeNull();
    expect(parseManageMode(["edit", "onboard-user"])).toBeNull();
  });
});

describe("resolveDashboardMode", () => {
  test("drops edit mode while the account is still unknown", () => {
    expect(
      resolveDashboardMode({
        currentKind: "unknown",
        mode: "edit",
      }),
    ).toBeNull();
  });

  test("drops onboarding mode after a matching setup completes", () => {
    expect(
      resolveDashboardMode({
        currentKind: "user",
        mode: "onboard-user",
      }),
    ).toBeNull();

    expect(
      resolveDashboardMode({
        currentKind: "organization",
        mode: "onboard-org",
      }),
    ).toBeNull();
  });
});

describe("shouldClearDashboardMode", () => {
  test("clears unsupported mode query values", () => {
    expect(
      shouldClearDashboardMode({
        currentKind: "organization",
        rawMode: "invalid",
      }),
    ).toBe(true);
  });

  test("clears stale onboarding or edit values that no longer match the account", () => {
    expect(
      shouldClearDashboardMode({
        currentKind: "unknown",
        rawMode: "edit",
      }),
    ).toBe(true);

    expect(
      shouldClearDashboardMode({
        currentKind: "organization",
        rawMode: "onboard-org",
      }),
    ).toBe(true);
  });

  test("keeps valid mode values in the URL", () => {
    expect(
      shouldClearDashboardMode({
        currentKind: "organization",
        rawMode: "edit",
      }),
    ).toBe(false);

    expect(
      shouldClearDashboardMode({
        currentKind: "user",
        rawMode: undefined,
      }),
    ).toBe(false);
  });
});
