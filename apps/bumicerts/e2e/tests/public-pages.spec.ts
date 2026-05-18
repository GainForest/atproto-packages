import { expect, test } from "@playwright/test";
import { screenshotStep } from "../support/artifacts";

const publicPages = [
  { path: "/", heading: /fund regenerative impact|bumicerts/i, name: "home" },
  { path: "/home", heading: /fund regenerative impact|bumicerts/i, name: "home-alias" },
  { path: "/explore", heading: /explore|bumicerts/i, name: "explore" },
  { path: "/leaderboard", heading: /leaderboard|impact champions|donors/i, name: "leaderboard" },
  { path: "/organizations", heading: /organizations|nature steward/i, name: "organizations" },
  { path: "/dashboard", heading: /dashboard|donations|total raised/i, name: "dashboard" },
  { path: "/checkout", heading: /checkout|cart|donation/i, name: "checkout" },
  { path: "/bumicert/create", heading: /create impact|create a bumicert|you are not signed in/i, name: "create" },
] as const;

test.describe("public pages", () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.name} renders`, async ({ page }, testInfo) => {
      const response = await page.goto(publicPage.path);
      expect(response?.status(), `${publicPage.path} should not server-error`).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByText(publicPage.heading).first()).toBeVisible({ timeout: 20_000 });
      await screenshotStep(page, testInfo, `public-${publicPage.name}`);
    });
  }

  test("explore empty-search edge case is handled", async ({ page }, testInfo) => {
    await page.goto("/explore");
    const search = page.getByRole("textbox").first();
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill(`no-results-${Date.now()}`);
    await screenshotStep(page, testInfo, "public-explore-empty-search-edge-case");
    await expect(search).toBeVisible();
  });

  test("unknown bumicert edge case shows a controlled not-found page", async ({ page }, testInfo) => {
    const response = await page.goto("/bumicert/did:plc:missing-e2e-rkey");
    expect(response?.status(), "unknown bumicert should render without a server error").toBeLessThan(500);
    await screenshotStep(page, testInfo, "public-unknown-bumicert-not-found-edge-case");
    await expect(page.getByRole("heading", { name: /404|not found/i }).first()).toBeVisible();
  });
});
