import { defineConfig, devices } from '@playwright/test';

/**
 * Initiative Workspace specs need both the API (real Postgres — see
 * e2e/global-setup.ts) and the web dev server running. `docker compose up
 * -d && pnpm db:migrate && pnpm db:seed` must have been run first; nothing
 * here starts Postgres itself.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @pdlc/api dev',
      cwd: '../..',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
