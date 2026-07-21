import { defineConfig } from "@playwright/test";

/**
 * Visual regression config for Domphy catalog pages.
 *
 * Requires the docs dev server:
 *   pnpm --filter domphy-web dev
 *
 * Then:
 *   pnpm --filter domphy-web visual:update   # write baselines
 *   pnpm --filter domphy-web visual          # compare
 *
 * Optional: VISUAL_BASE_URL=http://127.0.0.1:3000 (default).
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 800 },
    // Catalog assertions own screenshots via toHaveScreenshot; no extra on-fail dumps.
    screenshot: "off",
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
});
