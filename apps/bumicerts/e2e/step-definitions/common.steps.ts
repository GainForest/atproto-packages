/**
 * Common Step Definitions
 *
 * Shared steps used across multiple features:
 * - Health checks
 * - Navigation
 * - Page assertions
 */

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage, waitForAppReady } from '../support/utils.js'

/**
 * Health check: Verify the application is ready
 */
Given('the application is healthy', async function (this: AppWorld) {
  await waitForAppReady(this.env.appUrl)
})

/**
 * Navigation: Navigate to a specific path
 */
When('the user navigates to {string}', async function (this: AppWorld, path: string) {
  const page = getPage(this)
  const url = `${this.env.appUrl}${path}`
  await page.goto(url)
})

/**
 * Assertion: Verify page URL contains a string
 */
Then('the page URL should contain {string}', async function (this: AppWorld, urlPart: string) {
  const page = getPage(this)
  await expect(page).toHaveURL(new RegExp(urlPart))
})

/**
 * Assertion: Verify exact page URL
 */
Then('the page URL should be {string}', async function (this: AppWorld, expectedPath: string) {
  const page = getPage(this)
  const expectedUrl = `${this.env.appUrl}${expectedPath}`
  await expect(page).toHaveURL(expectedUrl)
})

/**
 * Assertion: Verify page is loaded (body is visible)
 */
Then('the page should be loaded', async function (this: AppWorld) {
  const page = getPage(this)
  // Wait for the page body to be visible
  await expect(page.locator('body')).toBeVisible()
})

/**
 * Assertion: Verify page title contains text
 */
Then('the page title should contain {string}', async function (this: AppWorld, titlePart: string) {
  const page = getPage(this)
  await expect(page).toHaveTitle(new RegExp(titlePart, 'i'))
})
