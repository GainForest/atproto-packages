/**
 * Custom World Class
 *
 * Stores per-scenario state that is shared across step definitions.
 * Each scenario gets a fresh instance of this world.
 *
 * Contains:
 * - Browser/context/page references
 * - Test environment config
 * - Generated test data (emails, usernames, etc.)
 * - API response storage for assertions
 */

import { World, type IWorldOptions } from '@cucumber/cucumber'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { testEnv } from './env.js'

export interface AppWorld extends World {
  // Test environment configuration
  env: typeof testEnv

  // Playwright objects (set by hooks)
  browser?: Browser
  context?: BrowserContext
  page?: Page

  // Generated test data
  testEmail?: string
  testHandle?: string
  testOtp?: string

  // API response storage (for API assertions)
  lastResponse?: {
    status: number
    body: unknown
  }
}

/**
 * Custom World implementation
 */
export class CustomWorld extends World implements AppWorld {
  env: typeof testEnv
  browser?: Browser
  context?: BrowserContext
  page?: Page

  testEmail?: string
  testHandle?: string
  testOtp?: string

  lastResponse?: {
    status: number
    body: unknown
  }

  constructor(options: IWorldOptions) {
    super(options)
    this.env = testEnv
  }
}

// Set the custom world as the default
export { CustomWorld as World }
