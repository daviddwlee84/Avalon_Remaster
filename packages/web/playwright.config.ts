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
      use: {
        browserName: 'chromium',
        // Disable Chrome's WebRTC mDNS-ip-hiding so the LAN smoke test can
        // open a DataChannel between two separate browser contexts running
        // on the same machine. With the feature on, each context generates
        // an unresolveable `<uuid>.local` ICE candidate and the connection
        // hangs in "checking" forever. Real-device LAN play uses mDNS
        // happily — only the cross-context, same-machine Playwright case
        // needs this opt-out.
        launchOptions: {
          args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
        },
      },
    },
  ],
});
