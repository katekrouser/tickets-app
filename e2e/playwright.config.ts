import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config (A14). Runs against a RUNNING full stack
 * (`docker compose up --build`): nginx-served SPA + backend + Postgres + Mailhog.
 *
 * Execute in CI/Docker (no browser is available in the authoring sandbox):
 *   E2E_BASE_URL=http://localhost:8080 MAILHOG_URL=http://localhost:8025 \
 *     npx playwright test --config e2e/playwright.config.ts
 *
 * Compatibility (REQUIREMENTS §11): the critical path runs on Chromium, Firefox
 * and WebKit-as-Edge-proxy; keep chromium as the always-on gate, the others as
 * the cross-browser matrix.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Cross-browser matrix (REQUIREMENTS §11: current desktop Chrome/Edge/Firefox).
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
});
