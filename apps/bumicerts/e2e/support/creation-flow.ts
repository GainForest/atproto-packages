import { expect, type Page, type TestInfo } from "@playwright/test";
import { resolve } from "node:path";
import { screenshotStep } from "./artifacts";

export async function fillBumicertWizard(page: Page, testInfo: TestInfo): Promise<string> {
  const title = `E2E Bumicert ${Date.now()}`;

  await page.goto("/bumicert/create");
  await expect(page.getByText(/create impact|create a bumicert/i).first()).toBeVisible({ timeout: 30_000 });
  await screenshotStep(page, testInfo, "create-landing");

  await page.getByRole("main").getByRole("link", { name: /^create a bumicert$/i }).click();
  await page.waitForURL(/\/bumicert\/create\/0/);
  await screenshotStep(page, testInfo, "create-step-1-empty");

  await page.locator('input[type="file"]').first().setInputFiles(resolve(process.cwd(), "e2e/fixtures/test-cover.png"));
  await page.getByPlaceholder("My Awesome Bumicert").first().fill(title);
  await page.locator("#is-ongoing").first().click();
  await page.getByText("Ecological Restoration", { exact: true }).first().click();
  await screenshotStep(page, testInfo, "create-step-1-complete");
  await page.getByRole("button", { name: /continue/i }).last().click();

  await expect(page.getByRole("heading", { name: /share your impact story/i }).first()).toBeVisible();
  const story = page.locator(".leaflet-editor__content .ProseMirror").first();
  await story.click();
  await story.fill("This E2E bumicert documents restoration work with durable local benefits and verifiable site evidence.");
  const shortDescription = page.locator('[contenteditable="true"]:visible').last();
  await shortDescription.click();
  await page.keyboard.type("E2E restoration impact summary with evidence-ready details.");
  await screenshotStep(page, testInfo, "create-step-2-complete");
  await page.getByRole("button", { name: /continue/i }).last().click();

  await expect(page.getByRole("heading", { name: /contributors and sites/i }).first()).toBeVisible({ timeout: 20_000 });
  const contributorInput = page.getByPlaceholder(/search|contributor|organization|name/i).first();
  await contributorInput.fill("E2E Steward Organization");
  await page.keyboard.press("Enter");

  const firstSiteButton = page.locator('button:has(svg.lucide-circle-dashed)').first();
  if (await firstSiteButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await firstSiteButton.click();
  } else {
    await page.getByRole("button", { name: /add a site/i }).first().click();
    await expect(page.getByRole("heading", { name: /add site/i })).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("Grassroots Farm").fill(`E2E Site ${Date.now()}`);
    await page.locator('input[type="file"]').last().setInputFiles(resolve(process.cwd(), "e2e/fixtures/test-site.geojson"));
    await screenshotStep(page, testInfo, "create-step-3-add-site-filled");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(/site added successfully/i)).toBeVisible({ timeout: 60_000 });
    await screenshotStep(page, testInfo, "create-step-3-site-added");
    await page.getByRole("button", { name: /^close$/i }).last().click();
    const createdSiteButton = page.locator('button:has(svg.lucide-circle-dashed)').first();
    if (await createdSiteButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createdSiteButton.click();
    }
  }
  await page.locator("#confirm-permissions").first().click();
  await page.locator("#agree-tnc").first().click();
  await screenshotStep(page, testInfo, "create-step-3-complete");
  await page.getByRole("button", { name: /continue/i }).last().click();

  await expect(page.getByText(/review|preview|ready/i).first()).toBeVisible({ timeout: 20_000 });
  await screenshotStep(page, testInfo, "create-step-4-review");
  await page.getByRole("button", { name: /continue/i }).last().click();

  await expect(page.getByRole("button", { name: /publish bumicert/i }).first()).toBeVisible({ timeout: 20_000 });
  await screenshotStep(page, testInfo, "create-step-5-ready-to-publish");
  await page.getByRole("button", { name: /publish bumicert/i }).first().click();

  await expect(page.getByRole("main").getByText(/published successfully/i).first()).toBeVisible({ timeout: 90_000 });
  await screenshotStep(page, testInfo, "create-published-successfully");
  return title;
}
