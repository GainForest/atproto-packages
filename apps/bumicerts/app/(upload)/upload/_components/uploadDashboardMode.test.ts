import { describe, expect, test } from "bun:test";
import { resolveDashboardMode } from "./uploadDashboardMode";

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
