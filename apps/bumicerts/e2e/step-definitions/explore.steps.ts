/**
 * Explore Page Step Definitions
 *
 * Steps specific to browsing bumicerts and organizations
 */

import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage } from '../support/utils.js'

/**
 * Assertion: Verify bumicert cards are visible
 */
Then('the user sees bumicert cards', async function (this: AppWorld) {
  const page = getPage(this)
  // Look for any card-like elements (adjust selector based on actual implementation)
  const cards = page.locator('[data-testid*="bumicert"], article, .card')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
})

/**
 * Assertion: Verify organization cards are visible
 */
Then('the user sees organization cards', async function (this: AppWorld) {
  const page = getPage(this)
  // Look for organization cards (adjust selector based on actual implementation)
  const cards = page.locator('[data-testid*="organization"], article, .card')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
})

/**
 * Action: Click on the first organization
 */
When('the user clicks on the first organization', async function (this: AppWorld) {
  const page = getPage(this)
  // Find and click the first organization link
  const firstOrgLink = page.locator('a[href*="/organization/"]').first()
  await firstOrgLink.click()
})

/**
 * Assertion: Verify organization profile page is displayed
 */
Then('the user sees the organization profile page', async function (this: AppWorld) {
  const page = getPage(this)
  // Verify URL contains organization path
  await expect(page).toHaveURL(/\/organization\/did:plc:[a-z0-9]+/)
  // Verify page body is visible
  await expect(page.locator('body')).toBeVisible()
})
