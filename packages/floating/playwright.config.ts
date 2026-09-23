import { defineConfig } from "@playwright/test";

/**
 * Real-browser channel for @domphy/floating. NOT part of `pnpm test` /
 * `pnpm -r test` — those stay jsdom. Run this lane alone:
 *
 *   pnpm --filter @domphy/floating test:e2e
 *
 * Exercises createFloating()/computePosition()/autoUpdate() against a real
 * layout and a real scroll pass — jsdom (createFloating.test.ts) stubs
 * getBoundingClientRect and cannot exercise autoUpdate's ResizeObserver/
 * scroll-listener wiring at all.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: "./test-results",
  use: {
    baseURL: process.env.FLOATING_E2E_BASE_URL ?? "http://127.0.0.1:5861",
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off",
    viewport: { width: 1000, height: 700 },
  },
  webServer: process.env.FLOATING_E2E_NO_SERVER
    ? undefined
    : {
        command:
          "pnpm exec vite --config vite.demo.config.ts --port 5861 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:5861/demo.html",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
