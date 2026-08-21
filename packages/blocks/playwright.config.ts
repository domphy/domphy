import { defineConfig } from "@playwright/test";

/**
 * Real-browser channel for @domphy/blocks. NOT part of `pnpm test` /
 * `pnpm -r test` — those stay jsdom. Run this lane alone:
 *
 *   pnpm --filter @domphy/blocks test:e2e
 *
 * One worker, Chromium only, dedicated demo port (5611) so it never
 * collides with `pnpm demo` on 5610 and does not fan out 173 jsdom
 * files next to a browser.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "./test-results",
  use: {
    baseURL: process.env.BLOCKS_E2E_BASE_URL ?? "http://127.0.0.1:5611",
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off",
    viewport: { width: 1280, height: 900 },
  },
  webServer: process.env.BLOCKS_E2E_NO_SERVER
    ? undefined
    : {
        command:
          "pnpm exec vite --config vite.demo.config.ts --port 5611 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:5611/demo.html",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
