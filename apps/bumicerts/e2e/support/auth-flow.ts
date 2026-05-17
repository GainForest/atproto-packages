import { expect, type Page, type TestInfo } from "@playwright/test";
import { screenshotStep } from "./artifacts";
import { getE2EEnv } from "./env";

function isExpectedOAuthUrl(url: URL, appUrl: string, expectedHost: string | null): boolean {
  const appHost = new URL(appUrl).hostname;
  const isExpectedHost = expectedHost
    ? url.hostname === expectedHost || url.hostname.endsWith(`.${expectedHost}`)
    : url.hostname !== appHost;

  return isExpectedHost && (url.pathname.includes("/oauth") || url.pathname.includes("authorize"));
}

function isAppUrl(url: string, appUrl: string): boolean {
  return new URL(url).origin === new URL(appUrl).origin;
}

async function clickFirstVisible(page: Page, labels: RegExp[]): Promise<void> {
  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await button.click();
      return;
    }
  }
  throw new Error(`Could not find visible button for ${labels.map(String).join(", ")}`);
}

export async function signInWithConfiguredAccount(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  const env = getE2EEnv();

  await page.goto("/bumicert/create");
  await expect(page.getByRole("heading", { name: /you are not signed in/i }).first()).toBeVisible({ timeout: 20_000 });
  await screenshotStep(page, testInfo, "auth-gated-create-page-signed-out");

  await page.getByRole("button", { name: /sign in/i }).first().click();
  await expect(page.getByRole("button", { name: /^handle$/i })).toBeVisible();
  await screenshotStep(page, testInfo, "auth-modal-open");

  await page.getByRole("button", { name: /^handle$/i }).click();
  const handleInput = page.locator("#login-handle");
  await handleInput.fill("invalid handle");
  await expect(page.getByText(/only letters, numbers, hyphens, and dots/i)).toBeVisible();
  await screenshotStep(page, testInfo, "auth-invalid-handle-edge-case");

  await handleInput.fill(env.testHandle);
  await screenshotStep(page, testInfo, "auth-handle-entered");
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL(
    (url) => isExpectedOAuthUrl(url, env.appUrl, env.testPdsDomain),
    { timeout: 30_000 },
  );
  await screenshotStep(page, testInfo, "auth-provider-password-page");

  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await passwordInput.fill(env.testPassword);
  await screenshotStep(page, testInfo, "auth-password-filled");
  const signInButton = page.getByRole("button", { name: /^sign in$/i }).first();
  if (await signInButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(signInButton).toBeEnabled({ timeout: 15_000 });
    await signInButton.click();
  } else {
    await clickFirstVisible(page, [/next/i, /^continue$/i, /submit/i]);
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
  const authorizeButton = page.getByRole("button", { name: /^authorize$/i }).first();
  await expect(authorizeButton).toBeVisible({ timeout: 30_000 });
  await screenshotStep(page, testInfo, "auth-consent-page");
  await authorizeButton.click();

  await page.waitForURL((url) => isAppUrl(url.toString(), env.appUrl), { timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText(/unknown|e2e|satyam|complete onboarding|my account/i).first()).toBeVisible({ timeout: 30_000 });
  await screenshotStep(page, testInfo, "auth-complete-signed-in");
}
