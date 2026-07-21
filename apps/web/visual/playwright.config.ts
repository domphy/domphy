import { defineConfig } from "@playwright/test";

/**
 * Visual regression against the standalone catalog server
 * (apps/web/visual/serve-standalone.mjs) — not press/dev islands.
 *
 *   node visual/serve-standalone.mjs          # :4177
 *   pnpm visual:update
 *   pnpm visual
 *
 * VISUAL_BASE_URL overrides default http://127.0.0.1:4177
 */
export default defineConfig({
  testDir: ".",
  testMatch: "catalog.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 300_000,
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:4177",
    viewport: { width: 1280, height: 800 },
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
  // Auto-start catalog server for `pnpm visual` when not already running.
  webServer: process.env.VISUAL_NO_SERVER
    ? undefined
    : {
        command: "node visual/serve-standalone.mjs --port 4177",
        url: "http://127.0.0.1:4177/?catalog=patches",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        cwd: "..",
      },
});
