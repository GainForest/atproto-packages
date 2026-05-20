import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3101);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

process.env.E2E_BASE_URL ??= baseURL;

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./reports/e2e/artifacts",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./reports/e2e/html", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "on",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `NEXT_PUBLIC_BASE_URL=${baseURL} bun run build && NEXT_PUBLIC_BASE_URL=${baseURL} bunx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    {
      name: "auth.setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["auth.setup"],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
