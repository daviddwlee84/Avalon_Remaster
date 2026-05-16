import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests live alongside the code in src/**/*.test.ts. The Playwright
    // suites under tests/ are driven by `bun run test:e2e` (Playwright runner),
    // so vitest must not pick them up — Playwright's `test()` API explodes
    // when called outside its own runner.
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node',
  },
});
