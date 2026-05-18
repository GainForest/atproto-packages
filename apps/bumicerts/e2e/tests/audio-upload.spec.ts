import { expect, type Page, test } from "@playwright/test";
import { screenshotStep } from "../support/artifacts";

const authStatePath = "e2e/.auth/user.json";

test.use({ storageState: authStatePath });

async function openAudioPage(page: Page, path = "/upload/audio") {
  await page.goto(path);
  await expect(page.getByRole("main").getByText("How does this work?")).toBeVisible({ timeout: 30_000 });
}

test.describe("audio upload workspace", () => {
  test("shows the simple upload flow, file size guidance, and live section counts", async ({ page }, testInfo) => {
    await openAudioPage(page);

    const main = page.getByRole("main");
    await expect(main.getByText("Choose an event")).toBeVisible();
    await expect(main.getByText("Add device info")).toBeVisible();
    await expect(main.getByText("Upload audio")).toBeVisible();
    await expect(main.getByText(/4MB or smaller/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /use taina/i })).toHaveAttribute("href", "https://t.me/TheTainaBot");

    await expect(page.getByRole("button", { name: /events\s+\d+/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /deployments\s+\d+/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /audio\s+\d+/i })).toBeVisible();

    await screenshotStep(page, testInfo, "audio-workspace-overview-live-data");
  });

  test("keeps section, mode, and search in the URL while browsing", async ({ page }, testInfo) => {
    await openAudioPage(page);

    await page.getByRole("button", { name: /deployments\s+\d+/i }).click();
    await expect(page).toHaveURL(/section=deployments/);

    const deploymentSearch = page.getByRole("main").getByPlaceholder(/search deployments/i);
    await expect(deploymentSearch).toBeVisible();
    await deploymentSearch.fill("AudioMoth");
    await expect(page).toHaveURL(/q=AudioMoth/);

    await page.getByRole("button", { name: /^new$/i }).click();
    await expect(page).toHaveURL(/mode=new/);
    await expect(page.getByRole("heading", { name: /create deployment/i })).toBeVisible();

    await page.getByRole("button", { name: /back to deployments/i }).click();
    await expect(page).toHaveURL(/section=deployments/);
    await expect(page.getByRole("main").getByPlaceholder(/search deployments/i)).toBeVisible();

    await screenshotStep(page, testInfo, "audio-workspace-url-state-live-data");
  });

  test("opens real records when present and otherwise shows controlled empty states", async ({ page }, testInfo) => {
    await openAudioPage(page);

    const main = page.getByRole("main");
    const firstEventCard = main.getByRole("button", { name: /\d+ deployments · \d+ recordings/i }).first();

    if (await firstEventCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstEventCard.click();
      await expect(page).toHaveURL(/mode=detail/);
      await expect(page.getByRole("heading", { name: /edit event/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "In this event" })).toBeVisible();
    } else {
      await expect(main.getByText(/no events yet/i)).toBeVisible();
    }

    await page.getByRole("button", { name: /deployments\s+\d+/i }).click();
    const firstDeploymentCard = main.getByRole("button", { name: /\d+ recordings · deployed/i }).first();
    if (await firstDeploymentCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstDeploymentCard.click();
      await expect(page).toHaveURL(/mode=detail/);
      await expect(page.getByRole("heading", { name: /edit deployment/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Related items" })).toBeVisible();
    } else {
      await expect(main.getByText(/no deployments yet/i)).toBeVisible();
    }

    await screenshotStep(page, testInfo, "audio-workspace-real-records-or-empty");
  });

  test("blocks files larger than 4MB before upload", async ({ page }, testInfo) => {
    await openAudioPage(page, "/upload/audio?section=recordings&mode=new");
    await expect(page.getByRole("heading", { name: /upload audio recording/i })).toBeVisible();

    const oversizedAudio = Buffer.alloc(4 * 1024 * 1024 + 1, 0);
    await page.getByRole("main").locator('input[type="file"]').setInputFiles({
      name: "too-large.wav",
      mimeType: "audio/wav",
      buffer: oversizedAudio,
    });

    await expect(page.getByText(/file size exceeds 4mb|larger than 4mb/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();

    await screenshotStep(page, testInfo, "audio-workspace-oversized-file-blocked");
  });
});
