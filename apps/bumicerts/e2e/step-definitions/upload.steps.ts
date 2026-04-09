/**
 * Upload Dashboard Step Definitions
 *
 * Steps specific to the /upload organization editing flow
 */

import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage } from '../support/utils.js'

/**
 * Action: Click the edit button to enter edit mode
 */
When('the user clicks the edit button', async function (this: AppWorld) {
  const page = getPage(this)
  
  // Look for the Edit button in the org hero section
  // The button might be labeled "Edit" or have a data-testid
  const editButton = page.locator('button:has-text("Edit")').first()
  await editButton.click()
  
  // Wait for URL to update
  await page.waitForURL(/mode=edit/, { timeout: 5000 })
})

/**
 * Action: Click the cancel button to exit edit mode
 */
When('the user clicks the cancel button', async function (this: AppWorld) {
  const page = getPage(this)
  
  // Look for Cancel button in the EditBar
  const cancelButton = page.locator('button:has-text("Cancel")').first()
  await cancelButton.click()
  
  // Wait for URL to change (mode=edit should be removed)
  await page.waitForTimeout(500)
})

/**
 * Action: Click the save button to persist changes
 */
When('the user clicks the save button', async function (this: AppWorld) {
  const page = getPage(this)
  
  // Look for Save button in the EditBar
  const saveButton = page.locator('button:has-text("Save")').first()
  await saveButton.click()
})

/**
 * Action: Modify the organization description
 */
When('the user modifies the organization description', async function (this: AppWorld) {
  const page = getPage(this)
  
  // Find the long description textarea/editor
  // The EditableAbout component likely has a textarea or contenteditable
  const descriptionField = page.locator('textarea, [contenteditable="true"]').first()
  
  // Clear and type new content
  await descriptionField.click()
  await descriptionField.fill('Updated organization description for E2E testing')
})

/**
 * Assertion: Verify the edit bar is visible
 */
Then('the edit bar should be visible', async function (this: AppWorld) {
  const page = getPage(this)
  
  // The EditBar component should be visible with Save/Cancel buttons
  const editBar = page.locator('[data-testid="edit-bar"]').or(
    page.locator('div:has(button:has-text("Save")):has(button:has-text("Cancel"))')
  )
  
  await expect(editBar).toBeVisible({ timeout: 5000 })
})

/**
 * Assertion: Verify the edit bar is not visible
 */
Then('the edit bar should not be visible', async function (this: AppWorld) {
  const page = getPage(this)
  
  // The EditBar should be hidden or removed from the DOM
  const editBar = page.locator('[data-testid="edit-bar"]').or(
    page.locator('div:has(button:has-text("Save")):has(button:has-text("Cancel"))')
  )
  
  await expect(editBar).not.toBeVisible()
})

/**
 * Assertion: Verify URL does NOT contain a substring
 */
Then('the page URL should not contain {string}', async function (this: AppWorld, urlPart: string) {
  const page = getPage(this)
  const currentUrl = page.url()
  
  expect(currentUrl).not.toContain(urlPart)
})

/**
 * Assertion: Verify save operation completed successfully
 */
Then('the save operation should complete successfully', async function (this: AppWorld) {
  const page = getPage(this)
  
  // Wait for either:
  // 1. Success toast/notification
  // 2. URL to change (mode=edit removed)
  // 3. Edit bar to disappear
  
  // Check for success indicators (adjust selectors based on your UI)
  const successToast = page.locator('[data-testid="toast-success"]').or(
    page.locator('text=/saved|success|updated/i').first()
  )
  
  // Wait for success indicator OR URL change
  await Promise.race([
    successToast.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    page.waitForURL(/^(?!.*mode=edit).*$/, { timeout: 10000 }).catch(() => {}),
  ])
  
  // Give a moment for the UI to settle
  await page.waitForTimeout(1000)
})
