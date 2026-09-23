import { defineConfig } from "@playwright/test";

/**
 * Real-browser channel for @domphy/theme. NOT part of `pnpm test` /
 * `pnpm -r test` — those stay jsdom. Run this lane alone:
 *
 *   pnpm --filter @domphy/theme test:e2e
 *
 * Exercises themeCSS()'s :root fallback, the data-theme flip, and the
 * resolveToneStep()/textToneOn()/textToneOnRampEdge() contract against real
 * Chromium getComputedStyle() — jsdom (packages/theme/tests/*.test.ts) never
 * resolves a CSS custom property to a concrete color at all, so those specs
 * check the var(--…) STRING themeColor() produces, never what it paints.
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
    baseURL: process.env.THEME_E2E_BASE_URL ?? "http://127.0.0.1:5930",
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off",
    viewport: { width: 800, height: 600 },
  },
  webServer: process.env.THEME_E2E_NO_SERVER
    ? undefined
    : {
        command:
          "pnpm exec vite --config vite.demo.config.ts --port 5930 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:5930/demo.html",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
