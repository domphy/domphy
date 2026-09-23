import { defineConfig } from "@playwright/test";

/**
 * Real-browser channel for @domphy/dnd. NOT part of `pnpm test` /
 * `pnpm -r test` — those stay jsdom. Run this lane alone:
 *
 *   pnpm --filter @domphy/dnd test:e2e
 *
 * Exercises keyboardSort()/keyboardSortGroup() against real Tab/Space/Arrow/
 * Escape and real browser focus/blur/scrollIntoView — the exact behavior
 * jsdom (packages/dnd/tests/keyboardSort.test.ts) cannot exercise.
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
    baseURL: process.env.DND_E2E_BASE_URL ?? "http://127.0.0.1:5860",
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off",
    viewport: { width: 800, height: 600 },
  },
  webServer: process.env.DND_E2E_NO_SERVER
    ? undefined
    : {
        command:
          "pnpm exec vite --config vite.demo.config.ts --port 5860 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:5860/demo.html",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
