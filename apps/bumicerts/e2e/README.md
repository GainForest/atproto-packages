# E2E Testing for Bumicerts

End-to-end testing setup using Gherkin + Cucumber.js + Playwright.

## Quick Start

### 1. Prerequisites

- Bun installed
- Node.js 22.x (see `.node-version` in project root)
- Dependencies installed (`bun install` already run)

### 2. Start the Dev Server

In one terminal, start the bumicerts app:

```bash
cd apps/bumicerts
bun dev
```

The app will start at `http://localhost:3001`

### 3. Run E2E Tests

In another terminal:

```bash
# Run with visible browser (for development/debugging)
cd apps/bumicerts
bun run test:e2e

# Run headless (faster, for CI)
bun run test:e2e:headless
```

## Test Results

After running tests:

- **HTML Report**: `reports/e2e.html` - Open in browser to view detailed results
- **Screenshots**: `reports/screenshots/` - Failure screenshots are saved here

## Project Structure

```
apps/bumicerts/e2e/
├── .env                          # Local environment config (gitignored)
├── .env.example                  # Environment template
├── cucumber.mjs                  # Cucumber configuration
├── tsconfig.e2e.json             # TypeScript config for E2E
├── features/                     # Gherkin feature files
│   └── explore.feature           # Explore page scenarios
├── step-definitions/             # Step implementations
│   ├── common.steps.ts           # Shared steps (navigation, assertions)
│   └── explore.steps.ts          # Explore-specific steps
└── support/                      # Test infrastructure
    ├── env.ts                    # Environment config loader
    ├── world.ts                  # Custom World (per-scenario state)
    ├── hooks.ts                  # Browser lifecycle management
    └── utils.ts                  # Helper functions
```

## Writing New Tests

### 1. Create a Feature File

Create `e2e/features/my-feature.feature`:

```gherkin
Feature: My Feature

  Background:
    Given the application is healthy

  Scenario: User can do something
    When the user navigates to "/some-page"
    Then the page should be loaded
```

### 2. Create Step Definitions

Create `e2e/step-definitions/my-feature.steps.ts`:

```typescript
import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { AppWorld } from '../support/world.js'
import { getPage } from '../support/utils.js'

When('the user does something', async function (this: AppWorld) {
  const page = getPage(this)
  // Your Playwright code here
  await page.click('button')
})

Then('something should happen', async function (this: AppWorld) {
  const page = getPage(this)
  await expect(page.locator('.result')).toBeVisible()
})
```

### 3. Run Your Test

```bash
bun run test:e2e
```

## Available Step Definitions

### Common Steps (from `common.steps.ts`)

**Given:**
- `the application is healthy` - Waits for health endpoint to respond

**When:**
- `the user navigates to "{path}"` - Navigate to a URL path

**Then:**
- `the page URL should contain "{text}"` - Assert URL contains text
- `the page URL should be "{path}"` - Assert exact URL path
- `the page should be loaded` - Assert page body is visible
- `the page title should contain "{text}"` - Assert page title

### Explore Steps (from `explore.steps.ts`)

**When:**
- `the user clicks on the first organization` - Click first org link

**Then:**
- `the user sees bumicert cards` - Assert bumicert cards visible
- `the user sees organization cards` - Assert org cards visible
- `the user sees the organization profile page` - Assert org profile loaded

## Environment Configuration

Edit `e2e/.env` to configure test behavior:

```bash
# Main application URL
E2E_APP_URL=http://localhost:3001

# Browser visibility (true = headless, false = visible)
E2E_HEADLESS=false

# Timeouts (optional)
E2E_DEFAULT_TIMEOUT=30000
E2E_NAVIGATION_TIMEOUT=30000
```

## Tips & Best Practices

### Writing Robust Tests

1. **Use semantic selectors**: Prefer `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`
2. **Wait for elements**: Playwright auto-waits, but use explicit waits for dynamic content
3. **Keep steps focused**: Each step should do one thing
4. **Store state in World**: Use `this.testEmail`, `this.testHandle`, etc. for scenario data

### Debugging Tests

1. **Run with visible browser**: `bun run test:e2e` (not headless)
2. **Add Playwright inspector**: Add `await page.pause()` in your step
3. **Check screenshots**: Failure screenshots are in `reports/screenshots/`
4. **Check HTML report**: Open `reports/e2e.html` for detailed results

### Common Patterns

**Waiting for navigation:**
```typescript
await page.click('a[href="/explore"]')
await page.waitForURL(/\/explore/)
```

**Asserting text content:**
```typescript
await expect(page.getByRole('heading')).toContainText('Welcome')
```

**Filling forms:**
```typescript
await page.fill('[name="email"]', 'test@example.com')
await page.click('button[type="submit"]')
```

## Future: Authentication Testing

To add login/auth tests:

1. Create `e2e/features/auth.feature`
2. Create `e2e/step-definitions/auth.steps.ts`
3. Test account needed on `climateai.org` PDS
4. Steps to automate:
   - Enter handle in login modal
   - Follow OAuth redirect
   - Enter password on PDS page
   - Handle callback
   - Verify authenticated state

See `docs/e2e-cucumber-setup.md` for more details on the testing framework.

## Troubleshooting

### Tests fail with "Application not ready"

- Ensure dev server is running: `bun dev`
- Check `E2E_APP_URL` in `e2e/.env` matches dev server port

### Browser doesn't launch

- Reinstall browsers: `bunx playwright install chromium`
- Check Playwright version: `bunx playwright --version`

### TypeScript errors in E2E code

- Check `e2e/tsconfig.e2e.json` is correctly configured
- Ensure `tsx` is installed: `bun add -d tsx`

### Steps show as "undefined"

- Check step definition files are in `e2e/step-definitions/`
- Check files have `.ts` extension
- Check Cucumber config includes `e2e/step-definitions/**/*.ts`
