import { expect, test } from "@playwright/test";
import { screenshotStep } from "../support/artifacts";
import { fillBumicertWizard } from "../support/creation-flow";

const authStatePath = "e2e/.auth/user.json";

test.use({ storageState: authStatePath, video: "on" });

test("adds evidence to a bumicert evidence timeline", async ({ page }, testInfo) => {
  await fillBumicertWizard(page, testInfo);

  await page.getByRole("link", { name: /link evidence now/i }).click();
  await expect(page.getByRole("heading", { name: /link evidence/i })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /linked evidence timeline/i })).toBeVisible();
  await expect(page.getByText(/0 items/i).first()).toBeVisible();
  await screenshotStep(page, testInfo, "evidence-timeline-ready");

  const documentsButton = page.getByRole("button", { name: /^documents$/i });
  await expect(documentsButton).toBeVisible();
  await documentsButton.click();
  const contentTypeSelect = page.getByRole("combobox").first();
  await expect(contentTypeSelect).toBeVisible();
  await expect(contentTypeSelect).toHaveText(/document/i);
  await contentTypeSelect.click();
  await expect(page.getByRole("option", { name: /^report$/i })).toBeVisible();
  await expect(page.getByRole("option", { name: /^audit$/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(contentTypeSelect).toHaveText(/document/i);
  await screenshotStep(page, testInfo, "evidence-file-tab-selected");

  const urlInput = page.getByPlaceholder(/url|link|https/i).first();
  await expect(urlInput).toBeVisible({ timeout: 10_000 });
  await urlInput.fill("not-a-valid-url");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.getByText(/enter a valid url/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /select evidence to link/i })).toBeVisible();
  await urlInput.fill("https://example.com/e2e-evidence-report");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.getByText(/enter a valid url/i)).not.toBeVisible();
  await expect(urlInput).toHaveValue("");
  await expect(page.getByText("https://example.com/e2e-evidence-report")).toBeVisible();
  await expect(page.getByRole("button", { name: /^remove$/i })).toBeVisible();
  await page.getByRole("button", { name: /^remove$/i }).click();
  await expect(page.getByText("https://example.com/e2e-evidence-report")).not.toBeVisible();
  await expect(page.getByText(/no files or links selected yet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /select evidence to link/i })).toBeVisible();
  await urlInput.fill("https://example.com/e2e-evidence-report");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.getByText("https://example.com/e2e-evidence-report")).toBeVisible();
  const selectedLinkRow = page
    .locator("div")
    .filter({ hasText: "External link" })
    .filter({ hasText: "https://example.com/e2e-evidence-report" })
    .last();
  await expect(selectedLinkRow).toBeVisible();
  await expect(selectedLinkRow.getByText(/^External link$/)).toBeVisible();

  const descriptionInput = page.getByPlaceholder(/description|note|context/i).first();
  if (await descriptionInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await descriptionInput.fill("E2E evidence report documenting the published restoration work.");
  }

  await screenshotStep(page, testInfo, "evidence-details-filled");
  const linkEvidenceButton = page.getByRole("button", { name: /link 1 item/i });
  await expect(linkEvidenceButton).toBeVisible();
  await linkEvidenceButton.click();
  await expect(page.getByText(/evidence report|example.com|linked|added/i).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/1 item/i).first()).toBeVisible();
  const documentFilter = page.getByRole("button", { name: /^document 1$/i });
  await expect(documentFilter).toBeVisible();
  await expect(page.getByRole("link", { name: /open linked file/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /remove evidence/i })).toBeVisible();
  await documentFilter.click();
  await expect(documentFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /open linked file/i })).toBeVisible();
  await page.getByRole("button", { name: /^tree$/i }).click();
  await expect(page.getByText(/no evidence matches this filter/i)).toBeVisible();
  await documentFilter.click();
  await page.getByRole("button", { name: /remove evidence/i }).click();
  await expect(page.getByText(/this cannot be undone/i)).toBeVisible();
  await expect(page.getByText(/remove.*document.*cannot be undone/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^remove$/i })).toBeVisible();
  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByText(/this cannot be undone/i)).not.toBeVisible();
  await expect(documentFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /remove evidence/i })).toBeVisible();
  const linkedFile = page.getByRole("link", { name: /open linked file/i });
  await expect(linkedFile).toBeVisible();
  await expect(linkedFile).toHaveAttribute("href", "https://example.com/e2e-evidence-report");
  await expect(linkedFile).toHaveAttribute("target", "_blank");
  await expect(linkedFile).toHaveAttribute("rel", /noopener/);
  await expect(linkedFile).toHaveAttribute("rel", /noreferrer/);
  const collapseEvidenceButton = page.getByRole("button", { name: /collapse evidence/i });
  await expect(collapseEvidenceButton).toHaveAttribute("aria-expanded", "true");
  await collapseEvidenceButton.click();
  const expandEvidenceButton = page.getByRole("button", { name: /expand evidence/i });
  await expect(expandEvidenceButton).toHaveAttribute("aria-expanded", "false");
  await expect(linkedFile).not.toBeVisible();
  await expandEvidenceButton.click();
  await expect(linkedFile).toBeVisible();
  const allFilter = page.getByRole("button", { name: /^all$/i });
  await allFilter.click();
  await expect(allFilter).toHaveAttribute("aria-pressed", "true");
  await expect(documentFilter).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: /^tree$/i })).toHaveAttribute("aria-pressed", "false");
  await expect(linkedFile).toBeVisible();
  const evidenceEntry = page.locator("article").filter({ has: linkedFile });
  await expect(evidenceEntry).toBeVisible();
  await expect(evidenceEntry.getByRole("button", { name: /collapse evidence/i })).toHaveAttribute("aria-expanded", "true");
  await expect(evidenceEntry.getByRole("button", { name: /remove evidence/i })).toBeVisible();
  await expect(evidenceEntry.getByText(/^Document$/).first()).toBeVisible();
  await expect(evidenceEntry.getByText(/linked/i).first()).toBeVisible();
  await screenshotStep(page, testInfo, "evidence-added-to-timeline");
});
