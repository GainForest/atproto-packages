import { expect, test } from "@playwright/test";
import { fillBumicertWizard } from "../support/creation-flow";

const authStatePath = "e2e/.auth/user.json";

test.use({ storageState: authStatePath });

test("creates a bumicert successfully", async ({ page }, testInfo) => {
  await fillBumicertWizard(page, testInfo);
  await expect(page.getByRole("link", { name: /view bumicert/i })).toBeVisible();
});
