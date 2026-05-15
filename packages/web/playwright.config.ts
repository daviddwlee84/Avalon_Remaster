import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  // Boot the Bun server + Vite dev server before tests.
  webServer: [
    {
      command: 'bun run --cwd ../server dev',
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: true,
      stderr: 'pipe',
    },
    {
      command: 'bun run dev',
      port: 5173,
      timeout: 30_000,
      reuseExistingServer: true,
      stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
