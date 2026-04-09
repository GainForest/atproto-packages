/**
 * Cucumber Lifecycle Hooks
 *
 * Manages Playwright browser lifecycle:
 * - BeforeAll: Launch browser, create report directories
 * - Before: Create fresh context + page for each scenario
 * - After: Capture screenshot on failure, clean up context
 * - AfterAll: Close browser
 */

import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium, type Browser } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AppWorld } from './world.js'

let sharedBrowser: Browser

// Set default timeout for all steps (60 seconds)
// This is important for remote deployments with cold starts and OAuth flows
setDefaultTimeout(60_000)

/**
 * Before all scenarios: Launch browser and ensure report directories exist
 */
BeforeAll(async function () {
  // Create reports directory if it doesn't exist
  try {
    mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true })
    mkdirSync(resolve(process.cwd(), 'reports/screenshots'), { recursive: true })
  } catch (err) {
    // Directory already exists, ignore
  }

  // Launch browser (shared across all scenarios for performance)
  sharedBrowser = await chromium.launch({
    headless: process.env.E2E_HEADLESS === 'true',
  })

  console.log('🚀 Browser launched')
})

/**
 * Before each scenario: Create fresh browser context and page
 */
Before(async function (this: AppWorld) {
  // Create isolated browser context (fresh cookies, storage, etc.)
  this.context = await sharedBrowser.newContext({
    viewport: { width: 1280, height: 720 },
  })

  // Create new page
  this.page = await this.context.newPage()

  // Set timeouts on page
  this.page.setDefaultNavigationTimeout(30_000)
  this.page.setDefaultTimeout(30_000)
})

/**
 * After each scenario: Capture screenshot on failure, clean up context
 */
After(async function (this: AppWorld, { result, pickle }) {
  // Capture screenshot on failure
  if (result?.status === 'FAILED' && this.page) {
    const screenshotPath = resolve(
      process.cwd(),
      'reports/screenshots',
      `${pickle.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`
    )

    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`📸 Screenshot saved: ${screenshotPath}`)
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    }
  }

  // Clean up browser context
  if (this.context) {
    await this.context.close()
  }
})

/**
 * After all scenarios: Close shared browser
 */
AfterAll(async function () {
  if (sharedBrowser) {
    await sharedBrowser.close()
    console.log('🛑 Browser closed')
  }
})
