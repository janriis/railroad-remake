import { defineConfig, devices } from '@playwright/test';

// UI smoke tests. Not part of `npm test` (keeps that fast): run `npm run test:e2e`.
// Uses the installed Google Chrome, so no browser download is needed.
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5190',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5190 --strictPort',
    url: 'http://localhost:5190',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } },
    },
  ],
});
