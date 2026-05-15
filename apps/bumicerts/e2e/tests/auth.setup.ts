import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { test } from "@playwright/test";
import { signInWithConfiguredAccount } from "../support/auth-flow";

const authStatePath = "e2e/.auth/user.json";

test("authenticates with the configured ATProto account and saves browser state", async ({ page }, testInfo) => {
  await signInWithConfiguredAccount(page, testInfo);
  await mkdir(dirname(authStatePath), { recursive: true });
  await page.context().storageState({ path: authStatePath });
});
