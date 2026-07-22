import { defineConfig } from '@playwright/test'

const remoteBaseUrl = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: remoteBaseUrl || 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: remoteBaseUrl ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-light',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
    },
    {
      name: 'desktop-dark',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
    },
    {
      name: 'mobile-light',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true, isMobile: true },
    },
    {
      name: 'mobile-dark',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true },
    },
  ],
})
