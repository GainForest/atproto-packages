/**
 * E2E Test Utilities
 *
 * Helper functions used across step definitions
 */

import type { Page } from '@playwright/test'
import type { AppWorld } from './world.js'

/**
 * Get the Playwright page from the World context
 * @throws Error if page is not initialized
 */
export function getPage(world: AppWorld): Page {
  if (!world.page) {
    throw new Error('Page not initialized. This should never happen in a properly configured scenario.')
  }
  return world.page
}

/**
 * Wait for the application to be ready
 * Polls the health endpoint until it returns 200
 */
export async function waitForAppReady(appUrl: string, timeoutMs = 30_000): Promise<void> {
  const startTime = Date.now()
  const healthUrl = `${appUrl}/api/health`

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(healthUrl)
      if (response.ok) {
        console.log('✅ Application is ready')
        return
      }
    } catch (err) {
      // App not ready yet, retry
    }

    // Wait 1 second before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Application did not become ready within ${timeoutMs}ms. Is the dev server running?`)
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
}

/**
 * Generate a unique test handle
 */
export function generateTestHandle(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}
